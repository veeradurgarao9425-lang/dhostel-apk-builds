import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';

interface DangerModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const DangerModal = ({ 
    visible, 
    title, 
    message, 
    confirmText = 'Delete', 
    cancelText = 'Cancel', 
    onConfirm, 
    onCancel 
}: DangerModalProps) => {
    const { isDark } = useTheme();
    const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true })
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 0.9, duration: 150, useNativeDriver: true })
            ]).start();
        }
    }, [visible]);

    if (!visible && fadeAnim.interpolate({inputRange: [0, 1], outputRange: [0, 1]}) === 0) return null;

    return (
        <Modal transparent visible={visible} onRequestClose={onCancel} animationType="none">
            <View style={S.overlay}>
                <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000', opacity: Animated.multiply(fadeAnim, 0.5) }]} />
                
                <Animated.View 
                    style={[
                        S.modalBox, 
                        { 
                            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                            transform: [{ scale: scaleAnim }],
                            opacity: fadeAnim
                        }
                    ]}
                >
                    <View style={S.iconBox}>
                        <Ionicons name="warning" size={32} color="#EF4444" />
                    </View>
                    
                    <Text style={[S.title, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>{title}</Text>
                    <Text style={[S.message, { color: isDark ? '#94A3B8' : '#64748B' }]}>{message}</Text>
                    
                    <View style={S.btnRow}>
                        <TouchableOpacity style={[S.btn, S.cancelBtn, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} onPress={onCancel}>
                            <Text style={[S.cancelBtnText, { color: isDark ? '#CBD5E1' : '#475569' }]}>{cancelText}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[S.btn, S.confirmBtn]} onPress={onConfirm}>
                            <Text style={S.confirmBtnText}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const S = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalBox: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    iconBox: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FEF2F2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 24,
    },
    btnRow: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    btn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelBtn: {
        // backgroundColor applied dynamically
    },
    cancelBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    confirmBtn: {
        backgroundColor: '#EF4444',
    },
    confirmBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    }
});
