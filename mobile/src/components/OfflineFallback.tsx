import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, Text, Dimensions, TouchableOpacity } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { COLORS } from '../theme/index';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export const OfflineFallback = ({ children }: { children: React.ReactNode }) => {
    const [isConnected, setIsConnected] = useState<boolean | null>(true);

    const checkConnection = () => {
        NetInfo.fetch().then(state => {
            setIsConnected(state.isConnected && state.isInternetReachable !== false);
        });
    };

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected && state.isInternetReachable !== false);
        });

        checkConnection();

        return () => {
            unsubscribe();
        };
    }, []);

    if (isConnected === false) {
        return (
            <View style={styles.container}>
                <View style={[styles.iconContainer, { backgroundColor: (COLORS.error || '#E53935') + '15' }]}>
                    <Ionicons name="wifi-outline" size={72} color={COLORS.error || '#E53935'} />
                    <View style={styles.badgeContainer}>
                        <Ionicons name="close-circle" size={32} color={COLORS.error || '#E53935'} />
                    </View>
                </View>
                <Text style={styles.title}>No Internet Connection</Text>
                <Text style={styles.subtitle}>Please check your network settings and try again.</Text>
                <TouchableOpacity 
                    style={[styles.retryBtn, { backgroundColor: COLORS.primary || '#7C3AED' }]} 
                    onPress={checkConnection}
                    activeOpacity={0.8}
                >
                    <Text style={styles.retryBtnText}>Retry Connection</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return <>{children}</>;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background || '#F5F7FA',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        position: 'relative',
    },
    badgeContainer: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.textPrimary || '#1A1A2E',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textSecondary || '#6B6B8A',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    retryBtn: {
        marginTop: 24,
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    retryBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: 'bold',
    },
});
