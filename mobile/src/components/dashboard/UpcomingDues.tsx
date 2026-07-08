import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

interface UpcomingDuesProps {
    data: {
        upcomingDues: any[];
    };
}

export const UpcomingDues = ({ data }: UpcomingDuesProps) => {
    const navigation = useNavigation<any>();
    const { theme, isDark, fontSize } = useTheme();
    const { t } = useTranslation();

    if (!data.upcomingDues || data.upcomingDues.length === 0) {
        return null;
    }

    return (
        <View style={s.sectionBlock}>
            <View style={s.sectionHeaderRow}>
                <View style={s.sectionTitleRow}>
                    <Ionicons name="time" size={13} color="#D97706" />
                    <Text style={[s.sectionTitle, { fontSize: fontSize - 1, color: theme.textSecondary }]}>
                        DUE IN 7 DAYS
                    </Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('PendingTab', { tab: 'Next 7 Days' })} activeOpacity={0.7}>
                    <Text style={s.seeAll}>{t('dashboard.viewAll')}</Text>
                </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 2 }}>
                {data.upcomingDues.map((item, idx) => {
                    const isToday = item.daysLeft === 0;
                    const isTomorrow = item.daysLeft === 1;
                    const isUrgent = item.daysLeft <= 2;
                    const cardBg = isDark
                        ? (isUrgent ? '#271800' : '#1A1400')
                        : (isUrgent ? '#FEF3C7' : '#FFF7ED');
                    const borderColor = isUrgent ? '#F59E0B' : '#FCD34D';
                    const accentColor = isUrgent ? '#D97706' : '#B45309';
                    const dueLabel = isToday ? 'Due Today!' : isTomorrow ? 'Tomorrow' : `${item.daysLeft}d left`;

                    return (
                        <TouchableOpacity
                            key={idx}
                            style={[s.card, { backgroundColor: cardBg, borderColor }]}
                            activeOpacity={0.8}
                            onPress={() => navigation.navigate('StudentDetails', { studentId: item.id })}
                        >
                            {/* Top: avatar + name */}
                            <View style={s.cardTop}>
                                <View style={[s.avatar, { backgroundColor: accentColor + '22' }]}>
                                    <Text style={[s.avatarLetter, { color: accentColor }]}>
                                        {(item.name || 'T')[0].toUpperCase()}
                                    </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.name, { color: isDark ? '#FEF3C7' : '#92400E' }]} numberOfLines={1}>{item.name}</Text>
                                    <Text style={[s.meta, { color: isDark ? '#FCD34D' : '#B45309' }]} numberOfLines={1}>
                                        {item.room_number ? `Room ${item.room_number}` : 'No Room'}
                                    </Text>
                                </View>
                                {!!item.phone && (
                                    <TouchableOpacity
                                        style={[s.callBtn, { backgroundColor: isDark ? '#422006' : '#FEF3C7' }]}
                                        onPress={(e) => { e.stopPropagation(); Linking.openURL(`tel:${item.phone}`); }}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="call" size={12} color="#D97706" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Bottom: amount + due badge */}
                            <View style={s.cardBottom}>
                                <Text style={[s.amount, { color: accentColor }]}>
                                    ₹{Number(item.amount).toLocaleString('en-IN')}
                                </Text>
                                <View style={[s.daysBadge, { backgroundColor: isUrgent ? '#F59E0B' : '#FCD34D' }]}>
                                    <Text style={[s.daysBadgeText, { color: isUrgent ? '#FFF' : '#78350F' }]}>{dueLabel}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const s = StyleSheet.create({
    sectionBlock: { gap: 8 },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 2,
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
    seeAll: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
    card: {
        width: 165,
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        gap: 10,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarLetter: {
        fontSize: 13,
        fontWeight: '800',
    },
    name: {
        fontSize: 12,
        fontWeight: '700',
    },
    meta: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 1,
    },
    callBtn: {
        width: 26,
        height: 26,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    amount: {
        fontSize: 15,
        fontWeight: '800',
    },
    daysBadge: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 20,
    },
    daysBadgeText: {
        fontSize: 9,
        fontWeight: '800',
    },
});
