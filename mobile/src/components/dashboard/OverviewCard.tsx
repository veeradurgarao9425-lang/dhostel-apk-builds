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

    if (data.totalBeds === 0) {
        return (
            <TouchableOpacity
                style={[
                    s.card,
                    {
                        backgroundColor: theme.cardBg,
                        borderColor: isDark ? '#334155' : '#F1F5F9',
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 16,
                        gap: 14
                    }
                ]}
                onPress={() => navigation.navigate('AddRoom')}
                activeOpacity={0.8}
            >
                <Animated.View style={{
                    transform: [{ scale: pulseValue }],
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: theme.primary,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: theme.primary,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 3,
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
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9', paddingHorizontal: 16, paddingVertical: 12 }]}>
            <View style={s.overviewRow}>
                <TouchableOpacity style={[s.overviewItem, { alignItems: 'flex-start' }]} activeOpacity={0.7} onPress={() => navigation.navigate('Students')}>
                    <Text style={[s.overviewValue, { color: '#7C3AED', fontSize: fontSize + 5 }]} numberOfLines={1}>{data.totalStudentsCount}</Text>
                    <Text style={[s.overviewLabel, { color: theme.textSecondary, fontSize: Math.max(9, fontSize - 4), textAlign: 'left' }]} numberOfLines={1}>{t('dashboard.tenants')}</Text>
                </TouchableOpacity>
                <View style={[s.overviewDivider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
                <TouchableOpacity style={[s.overviewItem, { alignItems: 'center' }]} activeOpacity={0.7} onPress={() => navigation.navigate('Rooms', { filter: 'All' })}>
                    <Text style={[s.overviewValue, { color: '#0284C7', fontSize: fontSize + 5 }]} numberOfLines={1}>{data.occupiedBeds}/{data.totalBeds}</Text>
                    <Text style={[s.overviewLabel, { color: theme.textSecondary, fontSize: Math.max(9, fontSize - 4), textAlign: 'center' }]} numberOfLines={1}>{t('dashboard.bedsOccupied')}</Text>
                </TouchableOpacity>
                <View style={[s.overviewDivider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
                <TouchableOpacity style={[s.overviewItem, { alignItems: 'flex-end' }]} activeOpacity={0.7} onPress={() => setShowCollectionSheet(true)}>
                    <Text style={[s.overviewValue, { color: '#10B981', fontSize: fontSize + 5 }]} numberOfLines={1}>{fmt(data.collectionStats.collected)}</Text>
                    <Text style={[s.overviewLabel, { color: theme.textSecondary, fontSize: Math.max(9, fontSize - 4), textAlign: 'right' }]} numberOfLines={1}>
                        {data.collectionStats.monthName || t('dashboard.month')} Collection
                    </Text>
                </TouchableOpacity>
            </View>

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
        alignItems: 'center',
        marginBottom: 14,
    },
    overviewItem: {
        flex: 1,
        alignItems: 'center',
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
