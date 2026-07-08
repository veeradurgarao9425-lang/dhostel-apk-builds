import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

interface UpcomingCheckoutSchedulesProps {
    data: {
        upcomingVacates: any[];
    };
}

const avatarLetter = (name: string) => (name || 'T')[0].toUpperCase();

export const UpcomingCheckoutSchedules = ({ data }: UpcomingCheckoutSchedulesProps) => {
    const navigation = useNavigation<any>();
    const { theme, isDark, fontSize } = useTheme();
    const { t } = useTranslation();

    if (!data.upcomingVacates || data.upcomingVacates.length === 0) {
        return null;
    }

    return (
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
            <View style={s.cardHeader}>
                <View style={s.cardHeaderLeft}>
                    <Ionicons name="calendar-outline" size={15} color="#EF4444" />
                    <Text style={[s.cardTitle, { fontSize: fontSize - 1, color: theme.textPrimary }]}>{t('dashboard.upcomingCheckoutSchedules')}</Text>
                </View>
            </View>
            <View style={{ gap: 10 }}>
                {data.upcomingVacates.map((item, idx) => (
                    <TouchableOpacity
                        key={idx}
                        style={[s.checkoutItem, { borderColor: isDark ? '#475569' : '#E2E8F0' }]}
                        onPress={() => navigation.navigate('StudentDetails', { studentId: item.student_id })}
                        activeOpacity={0.7}
                    >
                        <View style={[s.checkoutAvatar, { backgroundColor: theme.primary + '15' }]}>
                            <Text style={[s.checkoutAvatarText, { color: theme.primary }]}>
                                {avatarLetter(item.name)}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.checkoutName, { color: theme.textPrimary }]}>{item.name}</Text>
                            <Text style={[s.checkoutSub, { color: theme.textSecondary }]}>Room {item.room_number}</Text>
                        </View>
                        <View style={[
                            s.checkoutBadge,
                            { backgroundColor: item.daysLeft <= 3 ? '#FEE2E2' : '#FEF3C7' }
                        ]}>
                            <Text style={[
                                s.checkoutBadgeText,
                                { color: item.daysLeft <= 3 ? '#EF4444' : '#D97706' }
                            ]}>
                                {item.daysLeft <= 0 ? t('dashboard.today') : `${item.daysLeft} ${t('dashboard.daysLeft')}`}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const s = StyleSheet.create({
    card: {
        borderRadius: 24,
        padding: 22,
        elevation: 3,
        shadowColor: '#7C3AED',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        borderWidth: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 18,
    },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    cardTitle: { fontSize: 16, fontWeight: '800' },
    checkoutItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        gap: 10,
    },
    checkoutAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkoutAvatarText: {
        fontSize: 14,
        fontWeight: '700',
    },
    checkoutName: {
        fontSize: 13,
        fontWeight: '700',
    },
    checkoutSub: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    checkoutBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkoutBadgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
});
