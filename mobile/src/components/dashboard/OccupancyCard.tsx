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
    const { theme, isDark, fontSize } = useTheme();

    const { floorBreakdown = [] } = data;

    // If there is no floor data at all, do not render
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

    // Calculate total vacant beds across all floors
    const totalVacantBeds = floorBreakdown.reduce((acc, f) => acc + (f.available_beds || 0), 0);

    return (
        <View style={s.container}>
            {/* Section Header */}
            <View style={s.sectionHeader}>
                <View style={s.headerTitleGroup}>
                    <View style={[s.headerIconBadge, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.18)' : '#EEF2FF' }]}>
                        <Ionicons name="business" size={13} color="#6366F1" />
                    </View>
                    <Text style={[s.sectionTitle, { fontSize: fontSize - 2, color: theme.textSecondary }]}>
                        Floor Vacancy Map
                    </Text>
                </View>

                {/* Header Right Action: View All Rooms */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('Rooms')}
                    activeOpacity={0.7}
                    style={s.headerLinkBtn}
                >
                    <Text style={[s.headerLinkText, { color: theme.primary, fontSize: fontSize - 2 }]}>
                        Manage Rooms
                    </Text>
                    <Ionicons name="chevron-forward" size={12} color={theme.primary} />
                </TouchableOpacity>
            </View>

            {/* Main Interactive Floor Carousel / Stack */}
            <View
                style={[
                    s.mainCard,
                    {
                        backgroundColor: theme.cardBg,
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                    }
                ]}
            >
                {/* Card Sub-Header: Total Floors & Vacant Beds summary */}
                <View style={s.subHeaderRow}>
                    <Text style={[s.subHeaderLeft, { color: theme.textPrimary }]}>
                        Live Building Availability
                    </Text>
                    <View style={[s.vacantBadge, { backgroundColor: totalVacantBeds > 0 ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7') : (isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2') }]}>
                        <View style={[s.statusDot, { backgroundColor: totalVacantBeds > 0 ? '#10B981' : '#EF4444' }]} />
                        <Text style={[s.vacantBadgeText, { color: totalVacantBeds > 0 ? '#10B981' : '#EF4444' }]}>
                            {totalVacantBeds > 0 ? `${totalVacantBeds} Beds Vacant` : 'Fully Occupied'}
                        </Text>
                    </View>
                </View>

                {/* Horizontal Scroll of Floor Cards (Or Stack if <= 2 floors) */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={s.scrollContent}
                >
                    {floorBreakdown.map((floor, idx) => {
                        const isFull = floor.available_beds === 0;
                        const isLow = floor.available_beds <= 2 && floor.available_beds > 0;
                        const accentColor = isFull ? '#EF4444' : isLow ? '#F59E0B' : '#10B981';
                        const accentBg = isFull
                            ? (isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2')
                            : isLow
                                ? (isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB')
                                : (isDark ? 'rgba(16, 185, 129, 0.12)' : '#F0FDF4');

                        return (
                            <TouchableOpacity
                                key={`floor-map-card-${floor.floor_number}-${idx}`}
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
                                {/* Top: Floor Badge + Vacancy Pill */}
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
                                        <View style={[s.statusDot, { backgroundColor: accentColor }]} />
                                        <Text style={[s.pillText, { color: accentColor }]}>
                                            {isFull ? 'Full' : `${floor.available_beds} vacant`}
                                        </Text>
                                    </View>
                                </View>

                                {/* Middle: Floor Name & Room Count */}
                                <View style={s.tileMiddle}>
                                    <Text style={[s.floorTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                                        {formatFloorName(floor.floor_number)}
                                    </Text>
                                    <Text style={[s.floorSub, { color: theme.textSecondary }]}>
                                        {floor.total_rooms} {floor.total_rooms === 1 ? 'room' : 'rooms'} · {floor.occupied_beds}/{floor.total_beds} beds
                                    </Text>
                                </View>

                                {/* Bottom: Mini Visual Progress Bar */}
                                <View style={s.tileBottom}>
                                    <View style={[s.barTrack, { backgroundColor: isDark ? '#0F172A' : '#E2E8F0' }]}>
                                        <View
                                            style={[
                                                s.barFill,
                                                {
                                                    width: `${Math.min(100, Math.max(0, floor.fill_percentage))}%`,
                                                    backgroundColor: accentColor,
                                                }
                                            ]}
                                        />
                                    </View>
                                    <Text style={[s.percentText, { color: theme.textSecondary }]}>
                                        {floor.fill_percentage}%
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Tap Tip */}
                <View style={[s.footerHint, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                    <Ionicons name="hand-left-outline" size={11} color={theme.textSecondary} />
                    <Text style={[s.footerHintText, { color: theme.textSecondary }]}>
                        Tap any floor above to view its rooms and allocate beds
                    </Text>
                </View>
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
        fontWeight: '700',
    },
    mainCard: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        gap: 10,
    },
    subHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 2,
    },
    subHeaderLeft: {
        fontSize: 12.5,
        fontWeight: '700',
    },
    vacantBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    statusDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    vacantBadgeText: {
        fontSize: 10.5,
        fontWeight: '700',
    },
    scrollContent: {
        flexDirection: 'row',
        gap: 8,
        paddingVertical: 2,
    },
    floorTile: {
        width: 142,
        borderRadius: 14,
        borderWidth: 1,
        padding: 10,
        gap: 8,
    },
    tileTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    floorBadge: {
        width: 26,
        height: 26,
        borderRadius: 7,
        justifyContent: 'center',
        alignItems: 'center',
    },
    floorBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
    },
    pillBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 2.5,
        borderRadius: 10,
    },
    pillText: {
        fontSize: 9.5,
        fontWeight: '700',
    },
    tileMiddle: {
        gap: 2,
    },
    floorTitle: {
        fontSize: 12,
        fontWeight: '700',
    },
    floorSub: {
        fontSize: 10,
        fontWeight: '500',
    },
    tileBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    barTrack: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 2,
    },
    percentText: {
        fontSize: 9.5,
        fontWeight: '700',
    },
    footerHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderTopWidth: 1,
        paddingTop: 8,
        paddingHorizontal: 2,
    },
    footerHintText: {
        fontSize: 10.5,
        fontWeight: '500',
    },
});

export default OccupancyCard;
