import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated, Pressable, Platform } from 'react-native';
import { useTheme } from './ThemeContext';
import { Ionicons } from '@expo/vector-icons';

type ConfirmationConfig = {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
    variant?: 'danger' | 'warning' | 'info';
};

type ConfirmationContextType = (config: ConfirmationConfig) => void;

const ConfirmationContext = createContext<ConfirmationContextType | null>(null);

export const ConfirmationProvider = ({ children }: { children: React.ReactNode }) => {
    const { theme, isDark } = useTheme();
    const [visible, setVisible] = useState(false);
    const [config, setConfig] = useState<ConfirmationConfig | null>(null);
    const [loading, setLoading] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    const showConfirmation = (cfg: ConfirmationConfig) => {
        setConfig(cfg);
        setVisible(true);
    };

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 120,
                    friction: 10,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 0.9,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const handleConfirm = async () => {
        if (!config) return;
        setLoading(true);
        try {
            await config.onConfirm();
        } catch (e) {
            console.error('Confirmation action error:', e);
        } finally {
            setLoading(false);
            setVisible(false);
            setConfig(null);
        }
    };

    const handleCancel = () => {
        if (config?.onCancel) {
            config.onCancel();
        }
        setVisible(false);
        setConfig(null);
    };

    const getVariantDetails = () => {
        const variant = config?.variant || 'info';
        const title = config?.title?.toLowerCase() || '';
        
        if (variant === 'danger') {
            const isLogout = title.includes('log out') || title.includes('logout') || title.includes('sign out') || title.includes('signout');
            return {
                icon: isLogout 
                    ? <Ionicons name="log-out-outline" size={24} color="#EF4444" />
                    : <Ionicons name="trash-outline" size={24} color="#EF4444" />,
                iconBg: '#FEE2E2',
                confirmText: isLogout ? 'Yes, Log Out' : 'Delete',
            };
        } else if (variant === 'warning') {
            return {
                icon: <Ionicons name="alert-circle-outline" size={24} color="#F59E0B" />,
                iconBg: '#FEF3C7',
                confirmText: 'Continue',
            };
        } else {
            return {
                icon: <Ionicons name="help-circle-outline" size={24} color={theme.primary} />,
                iconBg: theme.primary + '15',
                confirmText: 'Confirm',
            };
        }
    };

    const details = getVariantDetails();

    return (
        <ConfirmationContext.Provider value={showConfirmation}>
            {children}
            {config && (
                <Modal
                    transparent
                    visible={visible}
                    animationType="none"
                    onRequestClose={handleCancel}
                >
                    <View style={styles.overlay}>
                        <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel}>
                            <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
                        </Pressable>

                        <Animated.View
                            style={[
                                styles.card,
                                {
                                    backgroundColor: theme.cardBg,
                                    transform: [{ scale: scaleAnim }],
                                    opacity: fadeAnim,
                                    shadowColor: isDark ? '#000' : '#475569',
                                    borderColor: isDark ? '#334155' : '#F1F5F9',
                                },
                            ]}
                        >
                            {/* No grab handle — centered dialog */}

                            {/* Header row: Left Icon, Right Text Column */}
                            <View style={styles.headerBlock}>
                                <View style={[styles.iconContainer, { backgroundColor: details.iconBg }]}>
                                    {details.icon}
                                </View>
                                <View style={styles.textContainer}>
                                    <Text style={[styles.title, { color: theme.textPrimary }]}>
                                        {config.title}
                                    </Text>
                                    <Text style={[styles.message, { color: theme.textSecondary }]}>
                                        {config.message}
                                    </Text>
                                </View>
                            </View>

                            {/* Divider line */}
                            <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />

                            {/* Actions Row */}
                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    onPress={handleCancel}
                                    style={[styles.btn, styles.cancelBtn, { borderColor: theme.primary }]}
                                    activeOpacity={0.7}
                                    disabled={loading}
                                >
                                    <Text style={[styles.cancelBtnText, { color: theme.primary }]}>
                                        {config.cancelText || 'Cancel'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleConfirm}
                                    style={[styles.btn, styles.confirmBtn, { backgroundColor: theme.primary }]}
                                    activeOpacity={0.8}
                                    disabled={loading}
                                >
                                    <Text style={styles.confirmBtnText}>
                                        {loading ? '...' : (config.confirmText || details.confirmText)}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </View>
                </Modal>
            )}
        </ConfirmationContext.Provider>
    );
};

export const useConfirmation = () => {
    const context = useContext(ConfirmationContext);
    if (!context) {
        throw new Error('useConfirmation must be used within a ConfirmationProvider');
    }
    return context;
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    },
    card: {
        width: '100%',
        borderRadius: 24,
        borderWidth: 1,
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 24,
        elevation: 20,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
    },
    grabHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    headerBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        width: '100%',
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.1,
    },
    message: {
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
        marginTop: 4,
    },
    divider: {
        height: 1,
        marginVertical: 18,
        width: '100%',
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    btn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelBtn: {
        borderWidth: 1.5,
        backgroundColor: 'transparent',
    },
    cancelBtnText: {
        fontSize: 14,
        fontWeight: '800',
    },
    confirmBtn: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    confirmBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
});
