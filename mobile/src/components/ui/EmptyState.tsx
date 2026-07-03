import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';

interface EmptyStateProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    actionLabel?: string;
    onAction?: () => void;
    iconColor?: string;
}

export const EmptyState = ({ icon, title, subtitle, actionLabel, onAction, iconColor }: EmptyStateProps) => {
    const { theme, isDark } = useTheme();
    const primary = iconColor || theme?.primary || '#8B291A';

    return (
        <View style={S.container}>
            {icon && (
                <View style={[S.iconWrap, { backgroundColor: primary + '15' }]}>
                    <Ionicons name={icon} size={42} color={primary} />
                </View>
            )}

            <Text style={[S.title, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>{title}</Text>
            <Text style={[S.subtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>{subtitle}</Text>
            
            {actionLabel && onAction && (
                <TouchableOpacity 
                    style={[S.btn, { backgroundColor: primary }]} 
                    onPress={onAction}
                    activeOpacity={0.8}
                >
                    <Text style={S.btnText}>{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const S = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    iconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    btn: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    }
});
