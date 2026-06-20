import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, Text, Dimensions } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { COLORS } from '../theme/index';

const { width, height } = Dimensions.get('window');

export const OfflineFallback = ({ children }: { children: React.ReactNode }) => {
    const [isConnected, setIsConnected] = useState<boolean | null>(true);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    if (isConnected === false) {
        return (
            <View style={styles.container}>
                <Image 
                    source={require('../../assets/signalfallbackimage.png')} 
                    style={styles.image} 
                    resizeMode="contain" 
                />
                <Text style={styles.title}>No Internet Connection</Text>
                <Text style={styles.subtitle}>Please check your network settings and try again.</Text>
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
    image: {
        width: width * 0.8,
        height: width * 0.8,
        marginBottom: 30,
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
    }
});
