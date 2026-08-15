import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, ToastAndroid } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { TenantAppQRModal } from './TenantAppQRModal';

interface TenantAppCardProps {
    theme: any;
    isDark: boolean;
    hostelCode?: string;
    isMini?: boolean;
}

export const TenantAppCard: React.FC<TenantAppCardProps> = ({ theme, isDark, hostelCode = 'HOSTEX', isMini = false }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Download the Hostex Tenant App! Use our Hostel Code: ${hostelCode}. https://hostex.in/app`,
                title: 'Hostex Tenant App',
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const handleCopyCode = async () => {
        await Clipboard.setStringAsync(hostelCode);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <View style={styles.wrapper}>
            <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={() => setModalVisible(true)}
                style={styles.cardShadow}
            >
                {isMini ? (
                    <View style={{ backgroundColor: isDark ? '#2E1A47' : '#F5F3FF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={{ color: '#7C3AED', fontWeight: '800', fontSize: 13, marginBottom: 6 }}>Hostex Tenant App</Text>
                            <Text style={{ color: isDark ? '#C4B5FD' : '#6B7280', fontSize: 10, marginBottom: 10, lineHeight: 14 }} numberOfLines={2}>
                                Manage rent, maintenance & dues on the go.
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <TouchableOpacity 
                                    style={{ backgroundColor: isDark ? '#4C1D95' : '#FFFFFF', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
                                    onPress={handleCopyCode}
                                >
                                    <Text style={{ color: isDark ? '#DDD6FE' : '#7C3AED', fontSize: 9, fontWeight: '700' }}>
                                        {isCopied ? 'Copied' : `Code: ${hostelCode}`}
                                    </Text>
                                    <Ionicons name={isCopied ? "checkmark-outline" : "copy-outline"} size={10} color={isDark ? '#DDD6FE' : '#7C3AED'} />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={{ backgroundColor: isDark ? '#4C1D95' : '#FFFFFF', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
                                    onPress={handleShare}
                                >
                                    <Ionicons name="share-social" size={10} color={isDark ? '#DDD6FE' : '#7C3AED'} />
                                    <Text style={{ color: isDark ? '#DDD6FE' : '#7C3AED', fontSize: 9, fontWeight: '700' }}>Share</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={{ backgroundColor: '#FFF', padding: 4, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                            <QRCode value="https://hostex.in/app" size={40} color="#1E293B" backgroundColor="#FFFFFF" />
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
                                <Text style={styles.title}>Install Hostex Tenant App</Text>
                                <Text style={styles.subtitle} numberOfLines={2}>
                                    Manage rent, maintenance, & dues directly from your mobile.
                                </Text>

                                <View style={styles.actionRow}>
                                    <TouchableOpacity 
                                        style={styles.codeButton}
                                        onPress={handleCopyCode}
                                    >
                                        <Text style={styles.codeText}>{isCopied ? 'Copied!' : `Code: ${hostelCode}`}</Text>
                                        <Ionicons name={isCopied ? "checkmark-outline" : "copy-outline"} size={14} color="#7C3AED" />
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity 
                                        style={styles.secondaryButton}
                                        onPress={handleShare}
                                    >
                                        <Ionicons name="share-social" size={14} color="#FFFFFF" />
                                        <Text style={styles.secondaryButtonText}>Share</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Right Side: QR Preview */}
                            <View style={styles.rightContent}>
                                <View style={styles.qrWrapper}>
                                    <QRCode
                                        value="https://hostex.in/app"
                                        size={45}
                                        color="#1E293B"
                                        backgroundColor="#FFFFFF"
                                    />
                                </View>
                            </View>
                        </View>
                    </LinearGradient>
                )}
            </TouchableOpacity>

            <TenantAppQRModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onShare={handleShare}
                theme={theme}
                isDark={isDark}
            />
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
        marginBottom: 4,
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 11,
        lineHeight: 16,
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
        gap: 6,
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
