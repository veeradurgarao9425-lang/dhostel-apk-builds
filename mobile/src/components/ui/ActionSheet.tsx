import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';

interface ActionOption {
    id: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    isDanger?: boolean;
}

interface ActionSheetProps {
    visible: boolean;
    onClose: () => void;
    options: ActionOption[];
    title?: string;
}

const { height } = Dimensions.get('window');

export const ActionSheet = ({ visible, onClose, options, title }: ActionSheetProps) => {
    const { isDark } = useTheme();
    const translateY = React.useRef(new Animated.Value(height)).current;
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
                Animated.spring(translateY, { toValue: 0, tension: 65, friction: 10, useNativeDriver: true })
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: height, duration: 200, useNativeDriver: true })
            ]).start();
        }
    }, [visible]);

    if (!visible && fadeAnim.interpolate({inputRange: [0, 1], outputRange: [0, 1]}) === 0) return null;

    return (
        <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
            <View style={S.overlay}>
                <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000', opacity: Animated.multiply(fadeAnim, 0.4) }]} />
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
                
                <Animated.View 
                    style={[
                        S.sheet, 
                        { 
                            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                            transform: [{ translateY }]
                        }
                    ]}
                >
                    <View style={S.handleContainer}>
                        <View style={[S.handle, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
                    </View>
                    
                    {title && (
                        <Text style={[S.title, { color: isDark ? '#94A3B8' : '#64748B' }]}>{title}</Text>
                    )}
                    
                    <View style={S.optionsContainer}>
                        {options.map((option, index) => (
                            <TouchableOpacity 
                                key={option.id} 
                                style={[
                                    S.optionBtn, 
                                    index !== options.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#F1F5F9' }
                                ]}
                                onPress={() => {
                                    onClose();
                                    setTimeout(() => option.onPress(), 300); // Wait for modal animation
                                }}
                            >
                                <Ionicons 
                                    name={option.icon as any} 
                                    size={22} 
                                    color={option.isDanger ? '#EF4444' : (isDark ? '#F8FAFC' : '#1E293B')} 
                                />
                                <Text style={[
                                    S.optionText, 
                                    { color: option.isDanger ? '#EF4444' : (isDark ? '#F8FAFC' : '#1E293B') }
                                ]}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    
                    <View style={{ height: 30 }} />
                </Animated.View>
            </View>
        </Modal>
    );
};

const S = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 24,
    },
    handleContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    handle: {
        width: 40,
        height: 5,
        borderRadius: 3,
    },
    title: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    optionsContainer: {
        width: '100%',
    },
    optionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 8,
    },
    optionText: {
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 16,
    }
});
