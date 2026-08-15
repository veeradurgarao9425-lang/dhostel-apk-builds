import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const AnimatedDateDisplay = () => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-15)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.delay(100), // slight delay for smooth entrance
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ])
        ]).start();
    }, []);

    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = new Date().toLocaleDateString('en-US', dateOptions as any);

    return (
        <Animated.View style={[
            styles.container, 
            { 
                opacity: fadeAnim, 
                transform: [
                    { translateY: slideAnim },
                    { scale: scaleAnim }
                ] 
            }
        ]}>
            <View style={styles.iconContainer}>
                <Ionicons name="calendar" size={15} color="#7C3AED" />
            </View>
            <Text style={styles.dateText}>{dateString}</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#F3E8FF',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E9D5FF',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    iconContainer: {
        marginRight: 8,
        backgroundColor: '#FFFFFF',
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    dateText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#6D28D9',
        letterSpacing: 0.3,
    }
});
