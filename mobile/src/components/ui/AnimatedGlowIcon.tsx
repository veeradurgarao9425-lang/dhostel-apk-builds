import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AnimatedGlowIconProps {
    Icon: any;
    iconSize?: number;
    containerSize?: number;
    gradientColors: [string, string];
    glowColor: string;
}

export const AnimatedGlowIcon = ({
    Icon,
    iconSize = 18,
    containerSize = 40,
    gradientColors,
    glowColor
}: AnimatedGlowIconProps) => {
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, [pulseAnim]);

    const scale = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.8, 1.4]
    });

    const opacity = pulseAnim.interpolate({
        inputRange: [0, 0.6, 1],
        outputRange: [0.6, 0, 0]
    });

    return (
        <View style={{ width: containerSize, height: containerSize, justifyContent: 'center', alignItems: 'center' }}>
            {/* Pulsing Outer Glow */}
            <Animated.View style={{
                position: 'absolute',
                width: containerSize,
                height: containerSize,
                borderRadius: containerSize / 2,
                backgroundColor: glowColor,
                transform: [{ scale }],
                opacity: opacity
            }} />
            
            {/* Inner Gradient Circle */}
            <LinearGradient
                colors={gradientColors}
                style={{
                    width: containerSize * 0.8,
                    height: containerSize * 0.8,
                    borderRadius: containerSize * 0.4,
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1
                }}
            >
                <Icon color="#FFFFFF" size={iconSize} />
            </LinearGradient>
        </View>
    );
};
