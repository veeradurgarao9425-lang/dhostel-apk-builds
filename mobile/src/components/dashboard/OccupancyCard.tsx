import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';

interface OccupancyCardProps {
    data: {
        totalBeds: number;
        occupiedBeds: number;
        availableBeds: number;
        totalRooms: number;
        availableRooms: number;
        occupancyRate: number;
    };
}

export const OccupancyCard = ({ data }: OccupancyCardProps) => {
    const navigation = useNavigation<any>();
    const { theme, isDark, fontSize } = useTheme();

    const { totalBeds, occupiedBeds, availableBeds, totalRooms, availableRooms } = data;

    if (totalBeds === 0) return null;

    const fillPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    // Color based on occupancy level
    const themeColor =
        fillPct >= 90 ? '#EF4444' :   // red — almost full
        fillPct >= 70 ? '#F59E0B' :   // amber — filling up
        '#10B981';                    // green — available

    const badgeBg = isDark
        ? (fillPct >= 90 ? 'rgba(239,68,68,0.15)' : fillPct >= 70 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)')
        : (fillPct >= 90 ? '#FEE2E2' : fillPct >= 70 ? '#FEF3C7' : '#D1FAE5');

    const statusText =
        fillPct >= 90 ? 'Almost Full' :
        fillPct >= 70 ? 'Filling Up' :
        fillPct >= 40 ? 'Good Vacancy' :
        'High Vacancy';

    return (
        <View style={s.sectionBlock}>
            {/* Header */}
            <View style={s.sectionHeaderRow}>
                <View style={s.sectionTitleRow}>
                    <Ionicons name="bed" size={13} color="#0284C7" />
                    <Text style={[s.sectionTitle, { fontSize: fontSize - 2, color: theme.textSecondary }]}>
                        Occupancy Overview
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Rooms')}
                    activeOpacity={0.7}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                >
                    <Text style={[s.viewAll, { color: theme.primary, fontSize: fontSize - 2 }]}>View Rooms</Text>
                    <Ionicons name="chevron-forward" size={12} color={theme.primary} style={{ marginTop: 1 }} />
                </TouchableOpacity>
            </View>

            {/* Premium Side-by-side circular dashboard card */}
            <TouchableOpacity
                style={[s.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
                onPress={() => navigation.navigate('Rooms')}
                activeOpacity={0.85}
            >
                <View style={s.mainRow}>
                    {/* Left Column: Concentric circular progress dial */}
                    <View style={s.leftCol}>
                        <View style={[s.dialOuter, { borderColor: isDark ? '#1E293B' : '#F1F5F9', backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                            {/* Inner border matches the level color */}
                            <View style={[s.dialInner, { borderColor: themeColor }]}>
                                <Text style={[s.dialPctText, { color: isDark ? theme.textPrimary : '#0F172A' }]}>
                                    {fillPct}%
                                </Text>
                                <Text style={[s.dialLabel, { color: theme.textSecondary }]}>
                                    Filled
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Right Column: Numeric data lists */}
                    <View style={s.rightCol}>
                        {/* Status tag */}
                        <View style={[s.statusTag, { backgroundColor: badgeBg }]}>
                            <View style={[s.statusDot, { backgroundColor: themeColor }]} />
                            <Text style={[s.statusTagText, { color: themeColor }]}>{statusText}</Text>
                        </View>

                        {/* Stats list */}
                        <View style={s.statsList}>
                            {/* Occupied */}
                            <View style={s.statRow}>
                                <View style={[s.indicatorDot, { backgroundColor: themeColor }]} />
                                <Text style={[s.statLabelText, { color: theme.textSecondary }]}>Occupied Beds</Text>
                                <Text style={[s.statValueText, { color: theme.textPrimary }]}>{occupiedBeds}</Text>
                            </View>
                            {/* Available */}
                            <View style={s.statRow}>
                                <View style={[s.indicatorDot, { backgroundColor: '#10B981' }]} />
                                <Text style={[s.statLabelText, { color: theme.textSecondary }]}>Available Beds</Text>
                                <Text style={[s.statValueText, { color: theme.textPrimary }]}>{availableBeds}</Text>
                            </View>
                            {/* Total */}
                            <View style={s.statRow}>
                                <View style={[s.indicatorDot, { backgroundColor: '#7C3AED' }]} />
                                <Text style={[s.statLabelText, { color: theme.textSecondary }]}>Total Beds</Text>
                                <Text style={[s.statValueText, { color: theme.textPrimary }]}>{totalBeds}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Footer with Room availability */}
                {totalRooms > 0 && (
                    <View style={[s.cardFooter, { borderTopColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                        <Ionicons name="information-circle-outline" size={13} color={theme.textSecondary} />
                        <Text style={[s.footerText, { color: theme.textSecondary }]}>
                            {availableRooms} of {totalRooms} rooms have vacant beds
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
};

const s = StyleSheet.create({
    sectionBlock: { marginVertical: 0 },
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
        gap: 5,
    },
    sectionTitle: {
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    viewAll: {
        fontWeight: '700',
    },
    card: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 14,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
    },
    mainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    leftCol: {
        width: '35%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rightCol: {
        width: '62%',
        gap: 8,
    },
    // Dial indicators
    dialOuter: {
        width: 82,
        height: 82,
        borderRadius: 41,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dialInner: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dialPctText: {
        fontSize: 16,
        fontWeight: '900',
    },
    dialLabel: {
        fontSize: 8.5,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginTop: -1,
    },
    // Status tag
    statusTag: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusTagText: {
        fontSize: 10,
        fontWeight: '700',
    },
    // Stats rows
    statsList: {
        gap: 4,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    indicatorDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    statLabelText: {
        fontSize: 11,
        fontWeight: '600',
        flex: 1,
    },
    statValueText: {
        fontSize: 11.5,
        fontWeight: '800',
    },
    // Footer
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderTopWidth: 1,
        paddingTop: 10,
        marginTop: 10,
    },
    footerText: {
        fontSize: 10,
        fontWeight: '600',
    },
});
