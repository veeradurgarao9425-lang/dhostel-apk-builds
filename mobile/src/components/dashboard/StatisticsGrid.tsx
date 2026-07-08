import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

interface StatisticsGridProps {
    data: {
        activeTenants: number;
        monthlyExpenses?: number;
        staffCount?: number;
    };
    fmt: (n: number) => string;
}

export const StatisticsGrid = ({ data, fmt }: StatisticsGridProps) => {
    const navigation = useNavigation<any>();
    const { theme, isDark, fontSize } = useTheme();
    const { t } = useTranslation();

    return (
        <View style={s.sectionBlock}>
            <Text style={[s.sectionTitle, { fontSize: fontSize, color: theme.textPrimary }]}>📊 {t('dashboard.statistics')}</Text>
            <View style={s.statisticsRow}>
                {/* Card 1: Total Tenants */}
                <TouchableOpacity
                    style={[s.statCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
                    onPress={() => navigation.navigate('Students')}
                    activeOpacity={0.8}
                >
                    <View style={[s.statIconBox, { backgroundColor: '#EDE9FE' }]}>
                        <Ionicons name="people" size={18} color="#7C3AED" />
                    </View>
                    <Text style={[s.statLabel, { color: theme.textSecondary }]} numberOfLines={1}>{t('dashboard.tenants')}</Text>
                    <Text style={[s.statNum, { color: '#7C3AED' }]} numberOfLines={1}>{data.activeTenants}</Text>
                </TouchableOpacity>

                {/* Card 2: Reports */}
                <TouchableOpacity
                    style={[s.statCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
                    onPress={() => navigation.navigate('Reports')}
                    activeOpacity={0.8}
                >
                    <View style={[s.statIconBox, { backgroundColor: '#FFEDD5' }]}>
                        <Ionicons name="bar-chart-outline" size={18} color="#EA580C" />
                    </View>
                    <Text style={[s.statLabel, { color: theme.textSecondary }]} numberOfLines={1}>{t('dashboard.reports')}</Text>
                    <Text style={[s.statNum, { color: '#EA580C', fontSize: 12 }]} numberOfLines={1}>{t('dashboard.view')}</Text>
                </TouchableOpacity>

                {/* Card 3: Expenses (This Month) */}
                <TouchableOpacity
                    style={[s.statCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
                    onPress={() => navigation.navigate('Expenses')}
                    activeOpacity={0.8}
                >
                    <View style={[s.statIconBox, { backgroundColor: '#E0F2FE' }]}>
                        <Ionicons name="trending-down" size={18} color="#0284C7" />
                    </View>
                    <Text style={[s.statLabel, { color: theme.textSecondary }]} numberOfLines={1}>{t('dashboard.expenses')}</Text>
                    <Text style={[s.statNum, { color: '#0284C7' }]} numberOfLines={1}>{fmt(data.monthlyExpenses || 0)}</Text>
                </TouchableOpacity>

                {/* Card 4: Staff */}
                <TouchableOpacity
                    style={[s.statCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
                    onPress={() => navigation.navigate('Staff')}
                    activeOpacity={0.8}
                >
                    <View style={[s.statIconBox, { backgroundColor: '#DCFCE7' }]}>
                        <Ionicons name="person" size={18} color="#16A34A" />
                    </View>
                    <Text style={[s.statLabel, { color: theme.textSecondary }]} numberOfLines={1}>{t('dashboard.staff')}</Text>
                    <Text style={[s.statNum, { color: '#16A34A' }]} numberOfLines={1}>{data.staffCount ?? 0}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const s = StyleSheet.create({
    sectionBlock: { gap: 10 },
    sectionTitle: { fontSize: 15, fontWeight: '800' },
    statisticsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 6,
    },
    statCard: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 6,
        position: 'relative',
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    statNum: {
        fontSize: 14,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 2,
    },
});
