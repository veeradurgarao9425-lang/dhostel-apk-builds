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
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9', paddingHorizontal: 16, paddingVertical: 14 }]}>
            <View style={s.overviewRow}>

                {/* ── Tenants ── */}
                <TouchableOpacity style={[s.overviewItem, { alignItems: 'flex-start' }]} activeOpacity={0.7} onPress={() => navigation.navigate('Students')}>
                    <View style={s.valueRow}>
                        <View style={[s.iconPill, { backgroundColor: isDark ? '#2D1B69' : '#EDE9FE' }]}>
                            <Ionicons name="people" size={13} color="#7C3AED" />
                        </View>
                        <Text style={[s.overviewValue, { color: '#7C3AED', fontSize: fontSize + 5 }]} numberOfLines={1}>
                            {data.totalStudentsCount}
                        </Text>
                    </View>
                    <Text style={[s.overviewLabel, { color: theme.textSecondary, fontSize: Math.max(9, fontSize - 4), textAlign: 'left' }]} numberOfLines={1}>
                        {t('dashboard.tenants')}
                    </Text>
                </TouchableOpacity>

                <View style={[s.overviewDivider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />

                {/* ── Beds ── */}
                <TouchableOpacity style={[s.overviewItem, { alignItems: 'center' }]} activeOpacity={0.7} onPress={() => navigation.navigate('Rooms', { filter: 'All' })}>
                    <View style={s.valueRow}>
                        <View style={[s.iconPill, { backgroundColor: isDark ? '#0C2840' : '#E0F2FE' }]}>
                            <Ionicons name="bed" size={13} color="#0284C7" />
                        </View>
                        <Text style={[s.overviewValue, { color: '#0284C7', fontSize: fontSize + 5 }]} numberOfLines={1}>
                            {data.occupiedBeds}/{data.totalBeds}
                        </Text>
                    </View>
                    <Text style={[s.overviewLabel, { color: theme.textSecondary, fontSize: Math.max(9, fontSize - 4), textAlign: 'center' }]} numberOfLines={1}>
                        {t('dashboard.bedsOccupied')}
                    </Text>
                    <View style={[s.subBadge, { backgroundColor: isDark ? '#0C2840' : '#E0F2FE' }]}>
                        <Ionicons name="trending-up" size={9} color="#0284C7" />
                        <Text style={[s.subBadgeText, { color: '#0284C7' }]}>{occupancyPct}% Occupied</Text>
                    </View>
                </TouchableOpacity>

                <View style={[s.overviewDivider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />

                {/* ── Collection ── */}
                <TouchableOpacity style={[s.overviewItem, { alignItems: 'flex-end' }]} activeOpacity={0.7} onPress={() => setShowCollectionSheet(true)}>
                    <View style={s.valueRow}>
                        <View style={[s.iconPill, { backgroundColor: isDark ? '#052E16' : '#D1FAE5' }]}>
                            <Ionicons name="wallet" size={13} color="#10B981" />
                        </View>
                        <Text style={[s.overviewValue, { color: '#10B981', fontSize: fontSize + 5 }]} numberOfLines={1}>
                            {fmt(data.collectionStats.collected)}
                        </Text>
                    </View>
                    <Text style={[s.overviewLabel, { color: theme.textSecondary, fontSize: Math.max(9, fontSize - 4), textAlign: 'left' }]} numberOfLines={1}>
                        {data.collectionStats.monthName || t('dashboard.month')} Collection
                    </Text>
                    {data.collectionStats.pending > 0 && (
                        <View style={[s.subBadge, { backgroundColor: isDark ? '#1A0A0A' : '#FEF2F2' }]}>
                            <Ionicons name="alert-circle" size={9} color="#EF4444" />
                            <Text style={[s.subBadgeText, { color: '#EF4444' }]}>{fmt(data.collectionStats.pending)} due</Text>
                        </View>
                    )}
                    {/* Tap hint */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 }}>
                        <Text style={{ fontSize: 9, color: theme.textSecondary, fontWeight: '600' }}>Details</Text>
                        <Ionicons name="chevron-forward" size={9} color={theme.textSecondary} />
                    </View>
                </TouchableOpacity>

            </View>

            {/* Progress bar */}
            <TouchableOpacity activeOpacity={0.7} onPress={() => setShowCollectionSheet(true)} style={s.overviewProgressWrap}>
                <View style={[s.progressBarBackground, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                    <View style={[s.progressBarFill, {
                        width: `${data.collectionStats.totalExpected > 0 ? Math.min(100, Math.round((data.collectionStats.collected / data.collectionStats.totalExpected) * 100)) : 0}%`,
                        backgroundColor: '#10B981'
                    }]} />
                </View>
                <View style={s.progressTextRow}>
                    <Text style={[s.progressTextLabel, { fontSize: Math.max(9, fontSize - 4), color: theme.textSecondary }]} numberOfLines={1}>
                        {t('dashboard.pending')}: {fmt(data.collectionStats.pending)}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
                </View>
            </TouchableOpacity>
        </View>
    );
};

const s = StyleSheet.create({
    card: {
        borderRadius: 24,
        elevation: 3,
        shadowColor: '#7C3AED',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        borderWidth: 1,
    },
    overviewRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    overviewItem: {
        flex: 1,
        alignItems: 'center',
    },
    iconPill: {
        width: 22,
        height: 22,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 3,
    },
    overviewDivider: {
        width: 1,
        alignSelf: 'stretch',
        marginHorizontal: 4,
    },
    overviewValue: {
        fontWeight: '800',
        marginBottom: 2,
    },
    overviewLabel: {
        fontWeight: '600',
        textAlign: 'center',
    },
    subBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 20,
        marginTop: 5,
    },
    subBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    overviewProgressWrap: {
        paddingHorizontal: 2,
    },
    progressBarBackground: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 4,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressTextRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressTextLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
});
