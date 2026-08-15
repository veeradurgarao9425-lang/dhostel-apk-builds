import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

interface TopOverdueStudentsProps {
    data: {
        unpaidStudents: any[];
    };
}

export const TopOverdueStudents = ({ data }: TopOverdueStudentsProps) => {
    const navigation = useNavigation<any>();
    const { theme, isDark, fontSize } = useTheme();
    const { t } = useTranslation();

    if (!data.unpaidStudents || data.unpaidStudents.length === 0) {
        return null;
    }

    return (
        <View style={s.sectionBlock}>
            <View style={s.sectionHeaderRow}>
                <View style={s.sectionTitleRow}>
                    <Ionicons name="warning" size={13} color="#DC2626" />
                    <Text style={[s.sectionTitle, { fontSize: fontSize - 1, color: theme.textSecondary }]}>
                        TOP OVERDUE
                    </Text>
                    {/* Green lightbulb tip badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0', marginLeft: 4 }}>
                        <Ionicons name="bulb" size={10} color="#10B981" />
                        <Text style={{ fontSize: 9.5, fontWeight: '700', color: isDark ? '#34D399' : '#047857' }}>Drag cards left & right</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => navigation.navigate('PendingTab')}
                    activeOpacity={0.7}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                >
                    <Text style={s.seeAll}>{t('dashboard.viewAll')}</Text>
                    <Ionicons name="chevron-forward" size={12} color="#7C3AED" style={{ marginTop: 1 }} />
                </TouchableOpacity>
            </View>
            <ScrollView horizontal nestedScrollEnabled={true} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 2 }}>
                {data.unpaidStudents.map((item, idx) => {
                    const isUrgent = item.daysLate > 30;
                    
                    // Soft red background tint for overdue alerts
                    const cardBg = isDark ? '#1E1212' : '#FFF5F5';
                    const borderColor = isDark ? '#4A1D1D' : '#FEE2E2';
                    const avatarBg = isDark ? '#3F1A1A' : '#FCA5A5';
                    const avatarColor = '#EF4444';
                    
                    const dueLabel = `${item.daysLate}d late`;
                    const badgeBg = '#EF4444';

                    return (
                        <TouchableOpacity
                            key={idx}
                            style={[s.card, { backgroundColor: cardBg, borderColor }]}
                            activeOpacity={0.8}
                            onPress={() => navigation.navigate('StudentDetails', { studentId: item.id })}
                        >
                            {/* Avatar + name */}
                            <View style={s.cardTop}>
                                <View style={[s.avatar, { backgroundColor: isDark ? '#4A1D1D' : '#FEE2E2' }]}>
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
                                    <View style={{ flexDirection: 'row', gap: 6 }}>
                                        <TouchableOpacity
                                            style={[s.callBtn, { backgroundColor: isDark ? '#064E3B' : '#DCFCE7' }]}
                                            onPress={(e) => { 
                                                e.stopPropagation(); 
                                                const msg = `Hi ${item.name}, this is a gentle reminder for your pending hostel rent of ₹${Number(item.amount).toLocaleString('en-IN')}. Please pay at the earliest.`;
                                                Linking.openURL(`whatsapp://send?phone=${item.phone}&text=${encodeURIComponent(msg)}`); 
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="logo-whatsapp" size={12} color="#16A34A" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[s.callBtn, { backgroundColor: isDark ? '#4A1D1D' : '#FEE2E2' }]}
                                            onPress={(e) => { e.stopPropagation(); Linking.openURL(`tel:${item.phone}`); }}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="call" size={12} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {/* Amount + days badge */}
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
        width: 190,
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
        color: '#FFF',
    },
});
