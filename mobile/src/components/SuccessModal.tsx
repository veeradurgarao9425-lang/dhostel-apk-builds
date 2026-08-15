import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Animated,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

interface SuccessModalProps {
    visible: boolean;
    title?: string;
    message?: string;
    onClose: () => void;
    autoCloseDuration?: number; // Optional auto-close in ms
    buttonText?: string;
    onButtonPress?: () => void;
}

export const SuccessModal = ({
    visible,
    title = 'Success',
    message = 'Operation completed successfully!',
    onClose,
    autoCloseDuration = 2500,
    buttonText = 'Dismiss',
    onButtonPress,
}: SuccessModalProps) => {
    const { theme, isDark } = useTheme();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.3)).current;
    const checkmarkScale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Animate In
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                // Animate checkmark bounce
                Animated.spring(checkmarkScale, {
                    toValue: 1,
                    tension: 60,
                    friction: 5,
                    useNativeDriver: true,
                }).start();
            });

            // Handle auto-close
            if (autoCloseDuration > 0) {
                const timer = setTimeout(() => {
                    handleClose();
                }, autoCloseDuration);
                return () => clearTimeout(timer);
            }
        } else {
            // Reset animations
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.3);
            checkmarkScale.setValue(0);
        }
    }, [visible]);

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.8,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    const handleButtonPress = () => {
        if (onButtonPress) {
            onButtonPress();
        } else {
            handleClose();
        }
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                {/* Backdrop */}
                <Animated.View
                    style={[
                        styles.backdrop,
                        {
                            opacity: fadeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 0.6],
                            }),
                        },
                    ]}
                />

                {/* Modal Container */}
                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            backgroundColor: theme.cardBg,
                            transform: [{ scale: scaleAnim }],
                            shadowColor: isDark ? '#000000' : '#475569',
                        },
                    ]}
                >
                    {/* Dynamic checkmark circle */}
                    <Animated.View
                        style={[
                            styles.iconWrapper,
                            {
                                backgroundColor: theme.success + '20',
                                transform: [{ scale: checkmarkScale }],
                            },
                        ]}
                    >
                        <Ionicons
                            name="checkmark-circle"
                            size={72}
                            color={theme.success}
                        />
                    </Animated.View>

                    {/* Text Details */}
                    <Text style={[styles.title, { color: theme.textPrimary }]}>
                        {title}
                    </Text>
                    <Text style={[styles.message, { color: theme.textSecondary }]}>
                        {message}
                    </Text>

                    {/* Button */}
                    <TouchableOpacity
                        onPress={handleButtonPress}
                        activeOpacity={0.8}
                        style={[styles.button, { backgroundColor: theme.primary }]}
                    >
                        <Text style={styles.buttonText}>{buttonText}</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#0F172A',
    },
    modalContainer: {
        width: width * 0.85,
        maxWidth: 340,
        padding: 24,
        borderRadius: 24,
        alignItems: 'center',
        elevation: 10,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
    },
    iconWrapper: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    message: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
        paddingHorizontal: 8,
    },
    button: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: 'bold',
    },
});
