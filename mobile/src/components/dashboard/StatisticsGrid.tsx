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
        prebookingsCount?: number;
    };
    fmt: (n: number) => string;
}

const StatCard = ({
    icon, iconColor, iconBg, label, value, onPress, isDark, theme
}: {
    icon: any; iconColor: string; iconBg: string; label: string; value: string | number;
    onPress: () => void; isDark: boolean; theme: any;
}) => (
    <TouchableOpacity
        style={[s.statCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
        onPress={onPress}
        activeOpacity={0.8}
    >
        <View style={[s.statIconBox, { backgroundColor: isDark ? '#1E293B' : iconBg }]}>
            <Ionicons name={icon} size={16} color={isDark ? theme.primary : iconColor} />
        </View>
        <Text style={[s.statNum, { color: isDark ? theme.textPrimary : iconColor }]} numberOfLines={1}>{value}</Text>
        <Text style={[s.statLabel, { color: theme.textSecondary }]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
);

export const StatisticsGrid = ({ data, fmt }: StatisticsGridProps) => {
    const navigation = useNavigation<any>();
    const { theme, isDark, fontSize } = useTheme();
    const { t } = useTranslation();

    return (
        <View style={s.sectionBlock}>
            <View style={s.sectionTitleRow}>
                <Ionicons name="stats-chart" size={13} color="#7C3AED" />
                <Text style={[s.sectionTitle, { fontSize: fontSize - 1, color: theme.textSecondary }]}>
                    {t('dashboard.statistics')}
                </Text>
            </View>
            <View style={s.statisticsRow}>
                <StatCard
                    icon="people"
                    iconColor="#7C3AED"
                    iconBg="#EDE9FE"
                    label={t('dashboard.tenants')}
                    value={data.activeTenants}
                    onPress={() => navigation.navigate('Students')}
                    isDark={isDark}
                    theme={theme}
                />
                <StatCard
                    icon="bar-chart"
                    iconColor="#EA580C"
                    iconBg="#FFEDD5"
                    label="Reports"
                    value="View"
                    onPress={() => navigation.navigate('Reports')}
                    isDark={isDark}
                    theme={theme}
                />
                <StatCard
                    icon="receipt"
                    iconColor="#0284C7"
                    iconBg="#E0F2FE"
                    label={t('dashboard.expenses')}
                    value={fmt(data.monthlyExpenses || 0)}
                    onPress={() => navigation.navigate('Expenses')}
                    isDark={isDark}
                    theme={theme}
                />
                <StatCard
                    icon="people-circle"
                    iconColor="#16A34A"
                    iconBg="#DCFCE7"
                    label={t('dashboard.staff')}
                    value={data.staffCount ?? 0}
                    onPress={() => navigation.navigate('Staff')}
                    isDark={isDark}
                    theme={theme}
                />
            </View>
        </View>
    );
};

const s = StyleSheet.create({
    sectionBlock: { gap: 8 },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 2,
    },
    sectionTitle: {
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statisticsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'stretch',
        gap: 8,
    },
    statCard: {
        flex: 1,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 6,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
    },
    statIconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    statNum: {
        fontSize: 14,
        fontWeight: '800',
        textAlign: 'center',
    },
    statLabel: {
        fontSize: 9.5,
        fontWeight: '600',
        textAlign: 'center',
    },
});
