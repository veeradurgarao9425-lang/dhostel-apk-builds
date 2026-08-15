import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, DimensionValue } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';

interface SkeletonLoaderProps {
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
    style?: any;
}

export const SkeletonLoader = ({ width = '100%', height = 20, borderRadius = 4, style }: SkeletonLoaderProps) => {
    const { isDark } = useTheme();
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, []);

    const opacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7]
    });

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: isDark ? '#334155' : '#E2E8F0',
                    opacity
                },
                style
            ]}
        />
    );
};

export const SkeletonCard = () => {
    const { isDark } = useTheme();
    return (
        <View style={[S.card, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
            <View style={S.row}>
                <SkeletonLoader width={48} height={48} borderRadius={12} />
                <View style={S.content}>
                    <SkeletonLoader width="70%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
                    <SkeletonLoader width="40%" height={14} borderRadius={4} />
                </View>
                <SkeletonLoader width={60} height={24} borderRadius={12} />
            </View>
        </View>
    );
};

const S = StyleSheet.create({
    card: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        marginLeft: 16,
        marginRight: 16,
    }
});
