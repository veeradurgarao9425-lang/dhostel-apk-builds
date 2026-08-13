import React from 'react';
import { View, Text, StyleSheet, Animated, useAnimatedValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef, useState } from 'react';

export const OfflineBanner = () => {
    const [isOffline, setIsOffline] = useState(false);
    const [wasOffline, setWasOffline] = useState(false);
    const translateY = useRef(new Animated.Value(-60)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const checkState = (state: any) => {
            const offline = state.isConnected === false || state.isInternetReachable === false;
            setIsOffline(offline);
            if (offline) setWasOffline(true);
        };

        NetInfo.fetch().then(checkState).catch(() => {});
        const unsub = NetInfo.addEventListener(checkState);
        return () => unsub();
    }, []);

    useEffect(() => {
        if (isOffline) {
            // Slide in
            Animated.parallel([
                Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 8 }),
                Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]).start();
        } else if (wasOffline) {
            // Briefly show "Back online" then slide out
            setTimeout(() => {
                Animated.parallel([
                    Animated.timing(translateY, { toValue: -60, duration: 300, useNativeDriver: true }),
                    Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
                ]).start(() => setWasOffline(false));
            }, 1800);
        }
    }, [isOffline, wasOffline]);

    if (!isOffline && !wasOffline) return null;

    return (
        <Animated.View
            style={[
                styles.banner,
                { transform: [{ translateY }], opacity },
                !isOffline && styles.bannerOnline,
            ]}
            pointerEvents="none"
        >
            <Ionicons
                name={isOffline ? 'cloud-offline' : 'cloud-done'}
                size={14}
                color="#FFF"
            />
            <Text style={styles.bannerText}>
                {isOffline ? 'No internet connection' : 'Back online'}
            </Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    banner: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: '#1E293B',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        paddingTop: 44,
        paddingBottom: 10,
    },
    bannerOnline: {
        backgroundColor: '#10B981',
    },
    bannerText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
});
