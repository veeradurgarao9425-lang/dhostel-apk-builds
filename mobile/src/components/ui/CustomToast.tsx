import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';

export type ToastVariant = 
    | 'success' | 'info' | 'warning' | 'error' 
    | 'payment' | 'online' | 'offline' 
    | 'expense' | 'notice' | 'lowBalance' 
    | 'saving' | 'downloading';

export interface CustomToastProps {
    variant: ToastVariant;
    title: string;
    message?: string;
    progress?: number; // 0-100 for downloading
    onAction?: () => void;
    onClose?: () => void;
}

const getVariantConfig = (variant: ToastVariant) => {
    switch (variant) {
        case 'success': return { icon: 'checkmark-circle', color: '#22C55E' };
        case 'info': return { icon: 'information-circle', color: '#3B82F6' };
        case 'warning': return { icon: 'warning', color: '#F59E0B' };
        case 'error': return { icon: 'close-circle', color: '#EF4444' };
        case 'payment': return { icon: 'wallet', color: '#8B5CF6' };
        case 'online': return { icon: 'wifi', color: '#22C55E' };
        case 'offline': return { icon: 'cloud-offline', color: '#64748B' };
        case 'expense': return { icon: 'checkmark-circle', color: '#22C55E', actionText: 'UNDO' };
        case 'notice': return { icon: 'notifications', color: '#3B82F6', actionText: 'VIEW' };
        case 'lowBalance': return { icon: 'warning', color: '#F59E0B', actionText: 'ADD MONEY' };
        case 'saving': return { icon: 'sync', color: '#8B5CF6', isSpinner: true }; // we use sync to simulate spinner
        case 'downloading': return { icon: 'download', color: '#3B82F6' };
        default: return { icon: 'checkmark-circle', color: '#22C55E' };
    }
};

export const CustomToast = ({ variant, title, message, progress, onAction, onClose }: CustomToastProps) => {
    const { isDark } = useTheme();
    const config = getVariantConfig(variant);

    return (
        <View style={[S.container, isDark && S.containerDark]}>
            <View style={S.leftBorder(config.color)} />
            
            <View style={S.contentWrap}>
                <View style={S.row}>
                    {/* Icon */}
                    <View style={S.iconBox}>
                        <Ionicons 
                            name={config.icon as any} 
                            size={24} 
                            color={config.color} 
                        />
                    </View>

                    {/* Texts */}
                    <View style={S.textCol}>
                        <Text style={[S.title, isDark && S.textDark]}>{title}</Text>
                        {message && (
                            <Text style={[S.message, isDark && S.textDimDark]}>{message}</Text>
                        )}
                    </View>

                    {/* Right Side (Action / Progress / Close) */}
                    <View style={S.rightSide}>
                        {variant === 'downloading' && progress !== undefined && (
                            <Text style={S.progressText}>{progress}%</Text>
                        )}
                        
                        {config.actionText && (
                            <TouchableOpacity onPress={onAction} style={S.actionBtn}>
                                <Text style={[S.actionText, { color: config.color }]}>
                                    {config.actionText}
                                </Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity onPress={onClose} style={S.closeBtn}>
                            <Ionicons name="close" size={20} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Progress Bar (Only for downloading) */}
                {variant === 'downloading' && (
                    <View style={S.progressBarBg}>
                        <View style={[S.progressBarFill, { width: `${progress}%` as any, backgroundColor: config.color }]} />
                    </View>
                )}
            </View>
        </View>
    );
};

const S = StyleSheet.create({
    container: {
        width: '90%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
        overflow: 'hidden',
        minHeight: 70,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    containerDark: {
        backgroundColor: '#1E293B',
        borderColor: '#334155',
    },
    leftBorder: (color: string) => ({
        width: 4,
        backgroundColor: color,
    }),
    contentWrap: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        justifyContent: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textCol: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 2,
    },
    message: {
        fontSize: 13,
        fontWeight: '500',
        color: '#64748B',
    },
    textDark: {
        color: '#F8FAFC',
    },
    textDimDark: {
        color: '#94A3B8',
    },
    rightSide: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginLeft: 12,
    },
    progressText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#3B82F6',
    },
    actionBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '700',
    },
    closeBtn: {
        padding: 4,
    },
    progressBarBg: {
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        marginTop: 12,
        width: '100%',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 2,
    }
});
