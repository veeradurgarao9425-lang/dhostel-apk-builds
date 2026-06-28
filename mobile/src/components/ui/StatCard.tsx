import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: keyof typeof Ionicons.glyphMap;
    trend?: {
        value: string;
        isPositive: boolean;
    };
    iconColor?: string;
    onPress?: () => void;
}

export const StatCard = ({ title, value, icon, trend, iconColor, onPress }: StatCardProps) => {
    const { theme, isDark } = useTheme();
    const primary = iconColor || theme?.primary || '#8B291A';
    
    const Wrapper = onPress ? TouchableOpacity : View;

    return (
        <Wrapper 
            style={[S.card, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#F1F5F9' }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={S.header}>
                <View style={[S.iconBox, { backgroundColor: primary + '15' }]}>
                    <Ionicons name={icon as any} size={20} color={primary} />
                </View>
                {trend && (
                    <View style={[S.trendBadge, { backgroundColor: trend.isPositive ? '#DCFCE7' : '#FEE2E2' }]}>
                        <Ionicons 
                            name={trend.isPositive ? 'trending-up' : 'trending-down'} 
                            size={12} 
                            color={trend.isPositive ? '#16A34A' : '#EF4444'} 
                        />
                        <Text style={[S.trendText, { color: trend.isPositive ? '#16A34A' : '#EF4444' }]}>
                            {trend.value}
                        </Text>
                    </View>
                )}
            </View>
            
            <View style={S.content}>
                <Text style={[S.value, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>{value}</Text>
                <Text style={[S.title, { color: isDark ? '#94A3B8' : '#64748B' }]}>{title}</Text>
            </View>
        </Wrapper>
    );
};

const S = StyleSheet.create({
    card: {
        flex: 1,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    trendText: {
        fontSize: 12,
        fontWeight: '600',
    },
    content: {
        gap: 4,
    },
    value: {
        fontSize: 24,
        fontWeight: '800',
    },
    title: {
        fontSize: 13,
        fontWeight: '500',
    }
});
