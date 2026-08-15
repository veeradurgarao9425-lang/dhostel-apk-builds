import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';

interface ErrorStateProps {
    title?: string;
    subtitle?: string;
    onRetry?: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
}

export const ErrorState = ({ 
    title = "Something went wrong", 
    subtitle = "We encountered an error while loading the data. Please try again.", 
    onRetry, 
    icon = 'alert-circle-outline',
    iconColor 
}: ErrorStateProps) => {
    const { theme, isDark } = useTheme();
    const primary = iconColor || theme?.primary || '#EF4444'; // Default to a red-ish color for errors

    return (
        <View style={S.container}>
            <View style={[S.iconWrap, { backgroundColor: primary + '15' }]}>
                <Ionicons name={icon} size={42} color={primary} />
            </View>

            <Text style={[S.title, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>{title}</Text>
            <Text style={[S.subtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>{subtitle}</Text>
            
            {onRetry && (
                <TouchableOpacity 
                    style={[S.btn, { backgroundColor: primary }]} 
                    onPress={onRetry}
                    activeOpacity={0.8}
                >
                    <Ionicons name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={S.btnText}>Try Again</Text>
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
