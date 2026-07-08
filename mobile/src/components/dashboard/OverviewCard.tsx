import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

interface OverviewCardProps {
    data: {
        totalBeds: number;
        occupiedBeds: number;
        totalStudentsCount: number;
        collectionStats: {
            collected: number;
            monthName: string;
            totalExpected: number;
            pending: number;
        };
    };
    setShowCollectionSheet: (show: boolean) => void;
    pulseValue: Animated.Value;
    fmt: (n: number) => string;
}

export const OverviewCard = ({ data, setShowCollectionSheet, pulseValue, fmt }: OverviewCardProps) => {
    const navigation = useNavigation<any>();
    const { theme, isDark, fontSize } = useTheme();
    const { t } = useTranslation();

    const occupancyPct = data.totalBeds > 0
        ? Math.round((data.occupiedBeds / data.totalBeds) * 100)
        : 0;

    const collectionPct = data.collectionStats.totalExpected > 0
        ? Math.min(100, Math.round((data.collectionStats.collected / data.collectionStats.totalExpected) * 100))
        : 0;

    if (data.totalBeds === 0) {
        return (
            <TouchableOpacity
                style={[s.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9', flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 }]}
                onPress={() => navigation.navigate('AddRoom')}
                activeOpacity={0.8}
            >
                <Animated.View style={{
                    transform: [{ scale: pulseValue }],
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: theme.primary,
                    justifyContent: 'center', alignItems: 'center',
                }}>
                    <Ionicons name="add" size={26} color="#FFF" />
                </Animated.View>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary, marginBottom: 2 }}>
                        {t('dashboard.registerRooms')}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: theme.textSecondary, fontWeight: '600', lineHeight: 15 }}>
                        {t('dashboard.addFirstRoom')}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
        );
    }

    return (
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>

            {/* ── Top row: Tenants + Beds ── */}
            <View style={s.topRow}>
                {/* Tenants */}
                <TouchableOpacity
                    style={[s.topCell, { borderRightWidth: 1, borderRightColor: isDark ? '#334155' : '#EEF2FF' }]}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('Students')}
                >
                    <View style={[s.iconPill, { backgroundColor: isDark ? '#2D1B69' : '#EDE9FE' }]}>
                        <Ionicons name="people" size={13} color="#7C3AED" />
                    </View>
                    <View>
                        <Text style={[s.topValue, { color: '#7C3AED', fontSize: fontSize + 5 }]} numberOfLines={1}>
                            {data.totalStudentsCount}
                        </Text>
                        <Text style={[s.topLabel, { color: theme.textSecondary, fontSize: Math.max(9, fontSize - 4) }]} numberOfLines={1}>
                            {t('dashboard.tenants')}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Beds Occupied */}
                <TouchableOpacity
                    style={s.topCell}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('Rooms', { filter: 'All' })}
                >
                    <View style={[s.iconPill, { backgroundColor: isDark ? '#0C2840' : '#E0F2FE' }]}>
                        <Ionicons name="bed" size={13} color="#0284C7" />
                    </View>
                    <View>
                        <Text style={[s.topValue, { color: '#0284C7', fontSize: fontSize + 5 }]} numberOfLines={1}>
                            {data.occupiedBeds}/{data.totalBeds}
                        </Text>
                        <Text style={[s.topLabel, { color: theme.textSecondary, fontSize: Math.max(9, fontSize - 4) }]} numberOfLines={1}>
                            {t('dashboard.bedsOccupied')}
                        </Text>
                    </View>
                    <View style={[s.badge, { backgroundColor: isDark ? '#0C2840' : '#E0F2FE' }]}>
                        <Ionicons name="trending-up" size={9} color="#0284C7" />
                        <Text style={[s.badgeText, { color: '#0284C7' }]}>{occupancyPct}%</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* ── Divider ── */}
            <View style={[s.hDivider, { backgroundColor: isDark ? '#1E293B' : '#EEF2FF' }]} />

            {/* ── Bottom: Collection Card ── */}
            <TouchableOpacity
                style={s.collectionRow}
                activeOpacity={0.8}
                onPress={() => setShowCollectionSheet(true)}
            >
                {/* Left: label + collected amount */}
                <View style={s.collectionLeft}>
                    <View style={[s.iconPill, { backgroundColor: isDark ? '#052E16' : '#D1FAE5' }]}>
                        <Ionicons name="wallet" size={13} color="#10B981" />
                    </View>
                    <View>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                            {data.collectionStats.monthName || t('dashboard.month')} Collection
                        </Text>
                        <Text style={{ fontSize: fontSize + 4, fontWeight: '800', color: '#10B981' }} numberOfLines={1}>
                            {fmt(data.collectionStats.collected)}
                        </Text>
                    </View>
                </View>

                {/* Right: pending + progress + tap hint */}
                <View style={s.collectionRight}>
                    {data.collectionStats.pending > 0 && (
                        <View style={[s.badge, { backgroundColor: isDark ? '#1A0A0A' : '#FEF2F2', marginBottom: 4 }]}>
                            <Ionicons name="alert-circle" size={9} color="#EF4444" />
                            <Text style={[s.badgeText, { color: '#EF4444' }]}>{fmt(data.collectionStats.pending)} due</Text>
                        </View>
                    )}
                    {/* Progress bar */}
                    <View style={{ width: 80 }}>
                        <View style={[s.progressBg, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                            <View style={[s.progressFill, { width: `${collectionPct}%` }]} />
                        </View>
                        <Text style={{ fontSize: 8.5, color: theme.textSecondary, fontWeight: '600', marginTop: 2 }}>
                            {collectionPct}% collected
                        </Text>
                    </View>
                </View>

                <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} style={{ marginLeft: 6 }} />
            </TouchableOpacity>

        </View>
    );
};

const s = StyleSheet.create({
    card: {
        borderRadius: 22,
        elevation: 3,
        shadowColor: '#7C3AED',
        shadowOpacity: 0.07,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        borderWidth: 1,
        overflow: 'hidden',
    },
    topRow: {
        flexDirection: 'row',
    },
    topCell: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    iconPill: {
        width: 26,
        height: 26,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    topValue: {
        fontWeight: '800',
        lineHeight: 22,
    },
    topLabel: {
        fontWeight: '600',
        color: '#64748B',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 20,
        marginLeft: 'auto',
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '700',
    },
    hDivider: {
        height: 1,
        marginHorizontal: 0,
    },
    collectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
    },
    collectionLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    collectionRight: {
        alignItems: 'flex-end',
    },
    progressBg: {
        height: 5,
        borderRadius: 3,
        overflow: 'hidden',
        width: 80,
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
        backgroundColor: '#10B981',
    },
});
