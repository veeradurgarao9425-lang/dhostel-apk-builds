import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';

const { width } = Dimensions.get('window');

export const SkeletonDetails = () => {
    const { theme, isDark } = useTheme();
    const animValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(animValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(animValue, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, [animValue]);

    const opacity = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7]
    });

    const baseColor = isDark ? '#334155' : '#E2E8F0';

    return (
        <View style={styles.container}>
            {/* Top Hero Section */}
            <Animated.View style={[styles.heroCard, { backgroundColor: theme.cardBg, opacity }]}>
                <View style={styles.heroRow}>
                    <View style={[styles.avatar, { backgroundColor: baseColor }]} />
                    <View style={styles.heroInfo}>
                        <View style={[styles.lineLarge, { backgroundColor: baseColor }]} />
                        <View style={[styles.lineMedium, { backgroundColor: baseColor, marginTop: 8 }]} />
                        <View style={[styles.badgesRow, { marginTop: 12 }]}>
                            <View style={[styles.badge, { backgroundColor: baseColor }]} />
                            <View style={[styles.badge, { backgroundColor: baseColor }]} />
                        </View>
                    </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.actionRow}>
                    <View style={[styles.actionBtn, { backgroundColor: baseColor }]} />
                    <View style={[styles.actionBtn, { backgroundColor: baseColor }]} />
                    <View style={[styles.actionBtn, { backgroundColor: baseColor }]} />
                </View>
            </Animated.View>

            {/* Content Section 1 */}
            <Animated.View style={[styles.contentCard, { backgroundColor: theme.cardBg, opacity }]}>
                <View style={[styles.lineLarge, { backgroundColor: baseColor, width: 120, marginBottom: 16 }]} />
                <View style={styles.statsGrid}>
                    <View style={[styles.statBox, { backgroundColor: baseColor }]} />
                    <View style={[styles.statBox, { backgroundColor: baseColor }]} />
                    <View style={[styles.statBox, { backgroundColor: baseColor }]} />
                    <View style={[styles.statBox, { backgroundColor: baseColor }]} />
                </View>
            </Animated.View>
            
            {/* Content Section 2 */}
            <Animated.View style={[styles.contentCard, { backgroundColor: theme.cardBg, opacity }]}>
                <View style={[styles.lineLarge, { backgroundColor: baseColor, width: 150, marginBottom: 16 }]} />
                <View style={[styles.lineFull, { backgroundColor: baseColor, marginBottom: 10 }]} />
                <View style={[styles.lineFull, { backgroundColor: baseColor, marginBottom: 10 }]} />
                <View style={[styles.lineMedium, { backgroundColor: baseColor }]} />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        gap: 16,
    },
    heroCard: {
        borderRadius: 16,
        padding: 16,
        elevation: 2,
    },
    heroRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    heroInfo: {
        marginLeft: 16,
        flex: 1,
    },
    lineLarge: {
        height: 18,
        width: '70%',
        borderRadius: 4,
    },
    lineMedium: {
        height: 14,
        width: '40%',
        borderRadius: 4,
    },
    lineFull: {
        height: 14,
        width: '100%',
        borderRadius: 4,
    },
    badgesRow: {
        flexDirection: 'row',
        gap: 8,
    },
    badge: {
        height: 24,
        width: 80,
        borderRadius: 12,
    },
    divider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 16,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    actionBtn: {
        flex: 1,
        height: 40,
        borderRadius: 12,
    },
    contentCard: {
        borderRadius: 16,
        padding: 16,
        elevation: 2,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statBox: {
        width: (width - 64 - 12) / 2,
        height: 60,
        borderRadius: 12,
    }
});
