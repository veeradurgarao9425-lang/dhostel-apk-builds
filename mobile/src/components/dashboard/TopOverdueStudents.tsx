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
                <Text style={[s.sectionTitle, { fontSize: fontSize, color: theme.textPrimary }]}>⚠️ Top Overdue Students</Text>
                <TouchableOpacity onPress={() => navigation.navigate('PendingTab')} activeOpacity={0.7}>
                    <Text style={s.seeAll}>{t('dashboard.viewAll')}</Text>
                </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
                {data.unpaidStudents.map((item, idx) => (
                    <TouchableOpacity
                        key={idx}
                        style={[s.dueChip, { backgroundColor: isDark ? '#2A1618' : '#FEF2F2', borderColor: '#FCA5A5' }]}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('StudentDetails', { studentId: item.id })}
                    >
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={[s.dueChipName, { color: isDark ? '#FECACA' : '#991B1B' }]} numberOfLines={1}>{item.name}</Text>
                            <Text style={[s.dueChipMeta, { color: isDark ? '#FCA5A5' : '#B91C1C' }]} numberOfLines={1}>
                                {item.room_number ? `Room ${item.room_number} · ` : ''}{item.daysLate}d overdue
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                            <Text style={[s.dueChipAmount, { color: '#DC2626' }]}>₹{Number(item.amount).toLocaleString('en-IN')}</Text>
                            {!!item.phone && (
                                <TouchableOpacity
                                    style={[s.dueChipCallBtn, { backgroundColor: isDark ? '#450a0a' : '#FEE2E2' }]}
                                    onPress={(e) => { e.stopPropagation(); Linking.openURL(`tel:${item.phone}`); }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="call" size={12} color="#DC2626" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const s = StyleSheet.create({
    sectionBlock: { gap: 10 },
    sectionTitle: { fontSize: 15, fontWeight: '800' },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    seeAll: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
    dueChip: {
        width: 190,
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    dueChipName: {
        fontSize: 13,
        fontWeight: '700',
    },
    dueChipMeta: {
        fontSize: 10.5,
        fontWeight: '600',
        marginTop: 3,
    },
    dueChipAmount: {
        fontSize: 15,
        fontWeight: '800',
    },
    dueChipCallBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
