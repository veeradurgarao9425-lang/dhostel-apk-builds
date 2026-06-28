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

    title: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    btn: {
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    }
});
