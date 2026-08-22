import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
        totalBeds: number;
        occupiedBeds: number;
        availableBeds: number;
        totalRooms: number;
        availableRooms: number;
        totalFloors?: number;
        floorBreakdown?: FloorInfo[];
        occupancyRate: number;
    };
}

export const OccupancyCard = ({ data }: OccupancyCardProps) => {
    const navigation = useNavigation<any>();
    const { theme, isDark, fontSize } = useTheme();

    const { totalBeds, occupiedBeds, availableBeds, totalRooms, availableRooms, totalFloors = 0, floorBreakdown = [] } = data;

    if (totalBeds === 0 && totalRooms === 0) return null;

    const fillPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
    const availPct = Math.max(0, 100 - fillPct);

    // Dynamic color theme based on occupancy level
    const statusConfig = (() => {
        if (fillPct >= 90) {
            return {
                label: 'Almost Full',
                color: '#EF4444',
                bgColor: isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEE2E2',
                icon: 'flame',
            };
        }
        if (fillPct >= 70) {
            return {
                label: 'High Occupancy',
                color: '#F59E0B',
                bgColor: isDark ? 'rgba(245, 158, 11, 0.16)' : '#FEF3C7',
                icon: 'trending-up',
            };
        }
        if (fillPct >= 40) {
            return {
                label: 'Good Vacancy',
                color: '#10B981',
                bgColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#D1FAE5',
                icon: 'checkmark-circle',
            };
        }
        return {
            label: 'High Vacancy',
            color: '#3B82F6',
            bgColor: isDark ? 'rgba(59, 130, 246, 0.16)' : '#DBEAFE',
            icon: 'bed-outline',
        };
    })();

    const formatFloorName = (fn: number) => {
        if (fn === 0) return 'Ground Floor';
        if (fn === 1) return '1st Floor';
        if (fn === 2) return '2nd Floor';
        if (fn === 3) return '3rd Floor';
        return `${fn}th Floor`;
    };

    return (
        <View style={s.sectionBlock}>
            {/* Header with Title & View Rooms Link */}
            <View style={s.sectionHeaderRow}>
                <View style={s.sectionTitleRow}>
                    <View style={[s.titleIconBadge, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#EEF2FF' }]}>
                        <Ionicons name="bed" size={13} color="#6366F1" />
                    </View>
                    <Text style={[s.sectionTitle, { fontSize: fontSize - 2, color: theme.textSecondary }]}>
                        Occupancy Overview
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Rooms')}
                    activeOpacity={0.7}
                    style={s.viewRoomsBtn}
                >
                    <Text style={[s.viewAll, { color: theme.primary, fontSize: fontSize - 2 }]}>View Rooms</Text>
                    <Ionicons name="chevron-forward" size={13} color={theme.primary} />
                </TouchableOpacity>
            </View>

            {/* High-Level Premium Occupancy Dashboard Card */}
            <TouchableOpacity
                style={[
                    s.card,
                    {
                        backgroundColor: theme.cardBg,
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                    }
                ]}
                onPress={() => navigation.navigate('Rooms')}
                activeOpacity={0.92}
            >
                {/* Top Summary Banner: Big Percentage + Dynamic Status Badge */}
                <View style={s.topBannerRow}>
                    <View style={s.mainMetricWrap}>
                        <View style={s.percentRow}>
                            <Text style={[s.bigPercentText, { color: theme.textPrimary }]}>
                                {fillPct}%
                            </Text>
                            <Text style={[s.percentLabel, { color: theme.textSecondary }]}>
                                Occupied
                            </Text>
                        </View>
                        <Text style={[s.subSummaryText, { color: theme.textSecondary }]}>
                            {occupiedBeds} of {totalBeds} beds · {totalRooms} rooms {totalFloors > 0 ? `across ${totalFloors} floors` : ''}
                        </Text>
                    </View>

                    {/* Status Pill Badge */}
                    <View style={[s.statusPill, { backgroundColor: statusConfig.bgColor }]}>
                        <Ionicons name={statusConfig.icon as any} size={13} color={statusConfig.color} />
                        <Text style={[s.statusPillText, { color: statusConfig.color }]}>
                            {statusConfig.label}
                        </Text>
                    </View>
                </View>

                {/* Visual Segmented Progress Bar */}
                <View style={s.progressSection}>
                    <View style={[s.progressBarBg, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                        <LinearGradient
                            colors={['#6366F1', '#8B5CF6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[s.progressBarFill, { width: `${fillPct}%` }]}
                        />
                    </View>
                    <View style={s.progressLabelsRow}>
                        <View style={s.progressLegend}>
                            <View style={[s.legendDot, { backgroundColor: '#8B5CF6' }]} />
                            <Text style={[s.legendText, { color: theme.textSecondary }]}>
                                Occupied ({fillPct}%)
                            </Text>
                        </View>
                        <View style={s.progressLegend}>
                            <View style={[s.legendDot, { backgroundColor: '#10B981' }]} />
                            <Text style={[s.legendText, { color: theme.textSecondary }]}>
                                Available ({availPct}%)
                            </Text>
                        </View>
                    </View>
                </View>

                {/* 4 Metric Cards Grid */}
                <View style={s.metricGrid}>
                    {/* Total Rooms */}
                    <View style={[s.metricCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <View style={s.metricIconRow}>
                            <View style={[s.miniIconCircle, { backgroundColor: 'rgba(79, 70, 229, 0.12)' }]}>
                                <Ionicons name="business" size={13} color="#4F46E5" />
                            </View>
                            <Text style={[s.metricValue, { color: theme.textPrimary }]}>{totalRooms}</Text>
                        </View>
                        <Text style={[s.metricTitle, { color: theme.textSecondary }]}>Total Rooms</Text>
                    </View>

                    {/* Occupied Beds */}
                    <View style={[s.metricCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <View style={s.metricIconRow}>
                            <View style={[s.miniIconCircle, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
                                <Ionicons name="people" size={13} color="#6366F1" />
                            </View>
                            <Text style={[s.metricValue, { color: theme.textPrimary }]}>{occupiedBeds}</Text>
                        </View>
                        <Text style={[s.metricTitle, { color: theme.textSecondary }]}>Occupied</Text>
                    </View>

                    {/* Available Beds */}
                    <View style={[s.metricCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <View style={s.metricIconRow}>
                            <View style={[s.miniIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                                <Ionicons name="bed" size={13} color="#10B981" />
                            </View>
                            <Text style={[s.metricValue, { color: '#10B981' }]}>{availableBeds}</Text>
                        </View>
                        <Text style={[s.metricTitle, { color: theme.textSecondary }]}>Available</Text>
                    </View>

                    {/* Total Floors / Capacity */}
                    <View style={[s.metricCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <View style={s.metricIconRow}>
                            <View style={[s.miniIconCircle, { backgroundColor: 'rgba(14, 165, 233, 0.12)' }]}>
                                <Ionicons name="layers-outline" size={13} color="#0EA5E9" />
                            </View>
                            <Text style={[s.metricValue, { color: theme.textPrimary }]}>{totalFloors > 0 ? totalFloors : totalBeds}</Text>
                        </View>
                        <Text style={[s.metricTitle, { color: theme.textSecondary }]}>{totalFloors > 0 ? 'Floors' : 'Total Beds'}</Text>
                    </View>
                </View>

                {/* Floor-by-Floor Filling Breakdown */}
                {floorBreakdown && floorBreakdown.length > 0 && (
                    <View style={[s.floorBreakdownContainer, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={[s.floorSectionTitle, { color: theme.textPrimary }]}>
                                🏢 Floor-by-Floor Filling
                            </Text>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary }}>
                                {floorBreakdown.length} floor{floorBreakdown.length === 1 ? '' : 's'}
                            </Text>
                        </View>

                        {floorBreakdown.map((floor, idx) => (
                            <View key={`floor-${floor.floor_number}-${idx}`} style={s.floorRow}>
                                <View style={s.floorHeader}>
                                    <Text style={[s.floorName, { color: theme.textPrimary }]}>
                                        {formatFloorName(floor.floor_number)}
                                    </Text>
                                    <Text style={[s.floorStats, { color: theme.textSecondary }]}>
                                        {floor.total_rooms} rooms · {floor.occupied_beds}/{floor.total_beds} beds ({floor.fill_percentage}%)
                                    </Text>
                                </View>
                                <View style={[s.floorBarBg, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                                    <View
                                        style={[
                                            s.floorBarFill,
                                            {
                                                width: `${floor.fill_percentage}%`,
                                                backgroundColor: floor.fill_percentage >= 90 ? '#EF4444' : floor.fill_percentage >= 60 ? '#8B5CF6' : '#10B981'
                                            }
                                        ]}
                                    />
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Footer Insight Note */}
                {totalRooms > 0 && (
                    <View style={[s.cardFooter, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                        <Ionicons name="sparkles" size={13} color="#F59E0B" />
                        <Text style={[s.footerText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                            {availableRooms > 0
                                ? `${availableRooms} of ${totalRooms} rooms have vacant beds available to assign.`
                                : `All ${totalRooms} rooms across your PG are currently at full capacity.`}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
};

const s = StyleSheet.create({
    sectionBlock: {
        marginVertical: 4,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 2,
        marginBottom: 8,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    titleIconBadge: {
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
    viewRoomsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    viewAll: {
        fontWeight: '700',
    },
    card: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    topBannerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    mainMetricWrap: {
        gap: 2,
    },
    percentRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    bigPercentText: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    percentLabel: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    subSummaryText: {
        fontSize: 12,
        fontWeight: '500',
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 14,
    },
    statusPillText: {
        fontSize: 11.5,
        fontWeight: '700',
    },
    progressSection: {
        gap: 6,
        marginBottom: 14,
    },
    progressBarBg: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        width: '100%',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressLabelsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressLegend: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    legendDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    legendText: {
        fontSize: 11,
        fontWeight: '600',
    },
    metricGrid: {
        flexDirection: 'row',
        gap: 8,
    },
    metricCard: {
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        padding: 10,
        gap: 4,
    },
    metricIconRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    miniIconCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    metricValue: {
        fontSize: 16,
        fontWeight: '900',
    },
    metricTitle: {
        fontSize: 10.5,
        fontWeight: '600',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderTopWidth: 1,
        paddingTop: 10,
        marginTop: 12,
    },
    footerText: {
        fontSize: 11,
        fontWeight: '500',
        flex: 1,
        lineHeight: 15,
    },
    floorBreakdownContainer: {
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        gap: 10,
    },
    floorSectionTitle: {
        fontSize: 12.5,
        fontWeight: '700',
    },
    floorRow: {
        gap: 4,
    },
    floorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    floorName: {
        fontSize: 11.5,
        fontWeight: '700',
    },
    floorStats: {
        fontSize: 11,
        fontWeight: '500',
    },
    floorBarBg: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        width: '100%',
    },
    floorBarFill: {
        height: '100%',
        borderRadius: 3,
    },
});

export default OccupancyCard;
