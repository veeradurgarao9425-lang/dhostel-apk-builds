import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: keyof typeof Ionicons.glyphMap;
    colorTheme: 'purple' | 'red' | 'green' | 'orange' | 'blue';
    pillText: string;
    fullWidth?: boolean;
}

const themeColors = {
    purple: { main: '#7C3AED', bg: '#F3E8FF', blob: '#E9D5FF' },
    red: { main: '#EF4444', bg: '#FEE2E2', blob: '#FECACA' },
    green: { main: '#10B981', bg: '#DCFCE7', blob: '#BBF7D0' },
    orange: { main: '#F59E0B', bg: '#FEF3C7', blob: '#FDE68A' },
    blue: { main: '#3B82F6', bg: '#DBEAFE', blob: '#BFDBFE' },
};

export const StatCard = ({ title, value, icon, colorTheme, pillText, fullWidth }: StatCardProps) => {
    const colors = themeColors[colorTheme] || themeColors.purple;

    return (
        <View style={[styles.card, fullWidth ? { flex: 1, marginRight: 0 } : { width: 145 }]}>
            {/* Top Right Blob */}
            <Svg 
                height="70" 
                width="70" 
                viewBox="0 0 100 100" 
                style={styles.blob}
            >
                <Path 
                    d="M100,0 v80 c-25,0 -40,-25 -65,-30 c-20,-4 -35,-30 -35,-50 Z" 
                    fill={colors.blob} 
                    opacity={0.6}
                />
            </Svg>

            {/* Icon */}
            <View style={[styles.iconWrap, { backgroundColor: colors.bg }]}>
                <Ionicons name={icon} size={20} color={colors.main} />
            </View>

            {/* Title & Value */}
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <Text style={[styles.value, { color: colors.main }]}>{value}</Text>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Pill */}
            <View style={[styles.pill, { backgroundColor: colors.bg }]}>
                <Text style={[styles.pillText, { color: colors.main }]}>{pillText}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 10,
        marginRight: 10,
        elevation: 1,
        shadowColor: '#94A3B8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    blob: {
        position: 'absolute',
        top: 0,
        right: 0,
    },
    iconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    title: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 2,
    },
    value: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 6,
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginBottom: 6,
    },
    pill: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    pillText: {
        fontSize: 9,
        fontWeight: '700',
    },
});
