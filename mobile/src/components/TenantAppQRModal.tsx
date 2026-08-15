import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';

const { width } = Dimensions.get('window');

interface TenantAppQRModalProps {
    visible: boolean;
    onClose: () => void;
    onShare: () => void;
    theme: any;
    isDark: boolean;
}

export const TenantAppQRModal: React.FC<TenantAppQRModalProps> = ({ visible, onClose, onShare, theme, isDark }) => {
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const scaleAnim = React.useRef(new Animated.Value(0.9)).current;

    React.useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.9);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                
                <Animated.View style={[
                    styles.contentContainer,
                    {
                        backgroundColor: theme.cardBg,
                        borderColor: isDark ? '#334155' : '#F1F5F9',
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }]
                    }
                ]}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>

                    <LinearGradient
                        colors={['#7C3AED', '#4F46E5']}
                        style={styles.headerIconBg}
                    >
                        <Ionicons name="business" size={32} color="#FFFFFF" />
                    </LinearGradient>

                    <Text style={[styles.title, { color: theme.textPrimary }]}>Hostex</Text>
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                        Scan to Install Tenant App
                    </Text>

                    <View style={styles.qrContainer}>
                        <QRCode
                            value="https://hostex.in/app"
                            size={180}
                            color="#1E293B"
                            backgroundColor="#FFFFFF"
                            logoSize={40}
                        />
                    </View>

                    <TouchableOpacity 
                        style={styles.shareButton} 
                        onPress={onShare}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#7C3AED', '#4F46E5']}
                            style={styles.shareGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Ionicons name="share-social" size={20} color="#FFFFFF" />
                            <Text style={styles.shareText}>Share App Link</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    contentContainer: {
        width: width * 0.85,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 8,
        zIndex: 10,
    },
    headerIconBg: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
    },
    qrContainer: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        marginBottom: 24,
    },
    shareButton: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
    },
    shareGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
    },
    shareText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    }
});
