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
    renewalStudents?: any[];
}

export const UpcomingDues = ({ data, renewalStudents = [] }: UpcomingDuesProps) => {
    const navigation = useNavigation<any>();
    const { theme, isDark, fontSize } = useTheme();
    const { t } = useTranslation();

    const hasDues = data.upcomingDues && data.upcomingDues.length > 0;
    const hasRenewals = renewalStudents && renewalStudents.length > 0;

    if (!hasDues && !hasRenewals) {
        return null;
    }

    return (
        <View style={{ gap: 16 }}>
            {/* ── DUE IN 7 DAYS ── */}
            {hasDues && (
                <View style={s.sectionBlock}>
                    <View style={s.sectionHeaderRow}>
                        <View style={s.sectionTitleRow}>
                            <Ionicons name="time" size={13} color="#D97706" />
                            <Text style={[s.sectionTitle, { fontSize: fontSize - 1, color: theme.textSecondary }]}>
                                DUE IN 7 DAYS
                            </Text>
                            {/* Green lightbulb tip badge — only show if Top Overdue section is not present above */}
                            {!data.unpaidStudents?.length && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0', marginLeft: 4 }}>
                                    <Ionicons name="bulb" size={10} color="#10B981" />
                                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: isDark ? '#34D399' : '#047857' }}>Drag cards left & right</Text>
                                </View>
                            )}
                        </View>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('PendingTab', { tab: 'Next 7 Days' })}
                            activeOpacity={0.7}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                        >
                            <Text style={s.seeAll}>{t('dashboard.viewAll')}</Text>
                            <Ionicons name="chevron-forward" size={12} color="#7C3AED" style={{ marginTop: 1 }} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal nestedScrollEnabled={true} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 2 }}>
                        {data.upcomingDues.map((item, idx) => {
                            const isToday = item.daysLeft === 0;
                            const isTomorrow = item.daysLeft === 1;
                            const isUrgent = item.daysLeft <= 2;

                            const cardBg = theme.cardBg;
                            const borderColor = isDark ? '#334155' : '#E2E8F0';
                            const avatarBg = isUrgent ? '#FEE2E2' : '#FEF3C7';
                            const avatarColor = isUrgent ? '#EF4444' : '#D97706';

                            const dueLabel = isToday ? 'Due Today!' : isTomorrow ? 'Tomorrow' : `${item.daysLeft}d left`;
                            const badgeBg = isToday ? '#EF4444' : (isTomorrow ? '#F59E0B' : '#64748B');

                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={[s.card, { backgroundColor: cardBg, borderColor }]}
                                    activeOpacity={0.8}
                                    onPress={() => navigation.navigate('StudentDetails', { studentId: item.id })}
                                >
                                    {/* Top: avatar + name */}
                                    <View style={s.cardTop}>
                                        <View style={[s.avatar, { backgroundColor: avatarBg }]}>
                                            <Text style={[s.avatarLetter, { color: avatarColor }]}>
                                                {(item.name || 'T')[0].toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[s.name, { color: theme.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                                            <Text style={[s.meta, { color: theme.textSecondary }]} numberOfLines={1}>
                                                {item.room_number ? `Room ${item.room_number}` : 'No Room'}
                                            </Text>
                                        </View>
                                        {!!item.phone && (
                                            <TouchableOpacity
                                                style={[s.callBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                                                onPress={(e) => { e.stopPropagation(); Linking.openURL(`tel:${item.phone}`); }}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="call" size={12} color={isUrgent ? '#EF4444' : '#64748B'} />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {/* Bottom: amount + due badge */}
                                    <View style={s.cardBottom}>
                                        <Text style={[s.amount, { color: theme.textPrimary }]}>
                                            ₹{Number(item.amount).toLocaleString('en-IN')}
                                        </Text>
                                        <View style={[s.daysBadge, { backgroundColor: badgeBg }]}>
                                            <Text style={[s.daysBadgeText, { color: '#FFF' }]}>{dueLabel}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* ── PLAN RENEWALS ── */}
            {hasRenewals && (
                <View style={s.sectionBlock}>
                    <View style={s.sectionHeaderRow}>
                        <View style={s.sectionTitleRow}>
                            <Ionicons name="refresh-circle" size={13} color="#D97706" />
                            <Text style={[s.sectionTitle, { fontSize: fontSize - 1, color: theme.textSecondary }]}>
                                PLAN RENEWALS
                            </Text>
                            <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                                <Text style={{ fontSize: 9, fontWeight: '800', color: '#92400E' }}>{renewalStudents.length}</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('PendingTab', { tab: 'Plan Renewals' })}
                            activeOpacity={0.7}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                        >
                            <Text style={s.seeAll}>{t('dashboard.viewAll')}</Text>
                            <Ionicons name="chevron-forward" size={12} color="#7C3AED" style={{ marginTop: 1 }} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal nestedScrollEnabled={true} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 2 }}>
                        {renewalStudents.map((student: any, idx: number) => {
                            const today = new Date(); today.setHours(0, 0, 0, 0);
                            const planEnd = new Date(student.plan_end_date); planEnd.setHours(0, 0, 0, 0);
                            const daysLeft = Math.ceil((planEnd.getTime() - today.getTime()) / 86400000);
                            const isExpired = daysLeft < 0;
                            const isUrgent = !isExpired && daysLeft <= 7;
                            const planLabels: Record<number, string> = { 3: '3M', 6: '6M', 12: '1Y' };
                            const planLabel = planLabels[student.fee_plan] || `${student.fee_plan}M`;
                            const accentColor = isExpired ? '#DC2626' : isUrgent ? '#EF4444' : '#D97706';
                            const avatarBg = isExpired ? '#FEE2E2' : isUrgent ? '#FEE2E2' : '#FEF3C7';

                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={[s.card, {
                                        backgroundColor: theme.cardBg,
                                        borderColor: accentColor + '50',
                                        borderWidth: 1.5,
                                        borderLeftWidth: 4,
                                        borderLeftColor: accentColor,
                                    }]}
                                    activeOpacity={0.8}
                                    onPress={() => navigation.navigate('StudentDetails', { studentId: student.student_id })}
                                >
                                    <View style={s.cardTop}>
                                        <View style={[s.avatar, { backgroundColor: avatarBg }]}>
                                            <Text style={[s.avatarLetter, { color: accentColor }]}>
                                                {(student.first_name || 'T')[0].toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <Text style={[s.name, { color: theme.textPrimary }]} numberOfLines={1}>
                                                    {student.first_name} {student.last_name || ''}
                                                </Text>
                                                <View style={{ backgroundColor: accentColor + '20', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                                    <Text style={{ fontSize: 8, fontWeight: '800', color: accentColor }}>{planLabel}</Text>
                                                </View>
                                            </View>
                                            <Text style={[s.meta, { color: theme.textSecondary }]} numberOfLines={1}>
                                                Room {student.room_number || 'N/A'}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={s.cardBottom}>
                                        <Text style={[s.amount, { color: accentColor, fontSize: 13 }]}>
                                            {student.plan_amount > 0 ? `₹${Number(student.plan_amount).toLocaleString('en-IN')}` : 'N/A'}
                                        </Text>
                                        <View style={[s.daysBadge, { backgroundColor: accentColor }]}>
                                            <Text style={[s.daysBadgeText, { color: '#FFF' }]}>
                                                {isExpired ? `Exp ${Math.abs(daysLeft)}d` : `${daysLeft}d left`}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}
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
