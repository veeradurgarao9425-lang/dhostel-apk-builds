import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import api from '../services/api';

interface TenantAppCardProps {
    theme: any;
    isDark: boolean;
    hostelCode?: string;
    isMini?: boolean;
}

export const TenantAppCard: React.FC<TenantAppCardProps> = ({ theme, isDark, hostelCode = 'HOSTIX', isMini = false }) => {
    const navigation = useNavigation<any>();
    const { user } = useAuth();
    const [isCopied, setIsCopied] = useState(false);

    const hostelId = user?.hostel_id || '1';
    const apiBase = api.defaults.baseURL || 'http://143.244.131.69:8081/api';
    const baseUrl = apiBase.replace(/\/api$/, '');
    const studentUrl = `${baseUrl}/register?hostelId=${hostelId}`;

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Self-register for our hostel/PG online: ${studentUrl}\nHostel Code: ${hostelCode}`,
                title: 'Hostix Self-Registration',
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const handleCopyCode = async () => {
        await Clipboard.setStringAsync(studentUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const openQRSignup = () => {
        navigation.navigate('QRSignup');
    };

    return (
        <View style={styles.wrapper}>
            <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={openQRSignup}
                style={styles.cardShadow}
            >
                {isMini ? (
                    <View style={{ backgroundColor: isDark ? '#2E1A47' : '#F5F3FF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={{ color: '#7C3AED', fontWeight: '800', fontSize: 13, marginBottom: 4 }}>Student & Guest QR</Text>
                            <Text style={{ color: isDark ? '#C4B5FD' : '#6B7280', fontSize: 10, marginBottom: 8, lineHeight: 14 }} numberOfLines={2}>
                                Scan to self-register new admissions and short-stay guests.
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <TouchableOpacity 
                                    style={{ backgroundColor: isDark ? '#4C1D95' : '#FFFFFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4, elevation: 1 }}
                                    onPress={openQRSignup}
                                >
                                    <Ionicons name="qr-code" size={10} color={isDark ? '#DDD6FE' : '#7C3AED'} />
                                    <Text style={{ color: isDark ? '#DDD6FE' : '#7C3AED', fontSize: 9, fontWeight: '700' }}>Open QR</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={{ backgroundColor: isDark ? '#4C1D95' : '#FFFFFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4, elevation: 1 }}
                                    onPress={handleShare}
                                >
                                    <Ionicons name="share-social" size={10} color={isDark ? '#DDD6FE' : '#7C3AED'} />
                                    <Text style={{ color: isDark ? '#DDD6FE' : '#7C3AED', fontSize: 9, fontWeight: '700' }}>Share Link</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={{ backgroundColor: '#FFF', padding: 4, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                            <QRCode value={studentUrl} size={42} color="#1E293B" backgroundColor="#FFFFFF" />
                        </View>
                    </View>
                ) : (
                    <LinearGradient
                        colors={['#7C3AED', '#4F46E5']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.cardGradient}
                    >
                        <View style={styles.contentRow}>
                            {/* Left Side: Text and Code */}
                            <View style={styles.leftContent}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                        <Text style={{ color: '#FFFFFF', fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase' }}>QR Signup</Text>
                                    </View>
                                </View>
                                <Text style={styles.title}>Register Students & Guests</Text>
                                <Text style={styles.subtitle} numberOfLines={2}>
                                    Self-admission & visitor check-in QR poster for your reception or entrance.
                                </Text>

                                <View style={styles.actionRow}>
                                    <TouchableOpacity 
                                        style={styles.codeButton}
                                        onPress={openQRSignup}
                                    >
                                        <Ionicons name="qr-code" size={13} color="#7C3AED" />
                                        <Text style={styles.codeText}>View QR Poster</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity 
                                        style={styles.secondaryButton}
                                        onPress={handleShare}
                                    >
                                        <Ionicons name="share-social" size={13} color="#FFFFFF" />
                                        <Text style={styles.secondaryButtonText}>Share Link</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Right Side: QR Preview */}
                            <View style={styles.rightContent}>
                                <View style={styles.qrWrapper}>
                                    <QRCode
                                        value={studentUrl}
                                        size={48}
                                        color="#1E293B"
                                        backgroundColor="#FFFFFF"
                                    />
                                </View>
                            </View>
                        </View>
                    </LinearGradient>
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 16,
    },
    cardShadow: {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
        borderRadius: 16,
    },
    cardGradient: {
        borderRadius: 16,
        padding: 14,
        overflow: 'hidden',
    },
    contentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    leftContent: {
        flex: 1,
        marginRight: 12,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 3,
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 11,
        lineHeight: 15,
        marginBottom: 10,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    codeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 5,
    },
    codeText: {
        color: '#7C3AED',
        fontWeight: '700',
        fontSize: 11,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    secondaryButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 11,
    },
    rightContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    qrWrapper: {
        backgroundColor: '#FFFFFF',
        padding: 6,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
});
