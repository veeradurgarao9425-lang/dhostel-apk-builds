import React, { useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    Text,
    Animated,
    Easing,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface FullScreenLoaderProps {
    visible: boolean;
    message?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Gemini AI glowing jewel dot colors
const DOT_THEMES = [
    { primary: '#7C3AED', secondary: '#A78BFA', glow: 'rgba(124, 58, 237, 0.6)' },
    { primary: '#3B82F6', secondary: '#60A5FA', glow: 'rgba(59, 130, 246, 0.6)' },
    { primary: '#06B6D4', secondary: '#22D3EE', glow: 'rgba(6, 182, 212, 0.6)' },
    { primary: '#EC4899', secondary: '#F472B6', glow: 'rgba(236, 72, 153, 0.6)' },
];

export const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({ visible, message }) => {
    // Master choreography animated value (0 -> 4 looping seamlessly)
    const masterAnim = useRef(new Animated.Value(0)).current;

    // Continuous smooth spin for orbital swirl
    const spinAnim = useRef(new Animated.Value(0)).current;

    // Ambient radial aura pulse
    const auraPulse = useRef(new Animated.Value(0.85)).current;

    // Text breathing opacity
    const textOpacity = useRef(new Animated.Value(0.7)).current;

    useEffect(() => {
        if (visible) {
            // 1. Continuous master choreography loop (6.4s full cycle through 4 distinct motion styles)
            masterAnim.setValue(0);
            const masterLoop = Animated.loop(
                Animated.timing(masterAnim, {
                    toValue: 4,
                    duration: 6400,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );
            masterLoop.start();

            // 2. Continuous smooth orbital spin
            spinAnim.setValue(0);
            const spinLoop = Animated.loop(
                Animated.timing(spinAnim, {
                    toValue: 1,
                    duration: 3200,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );
            spinLoop.start();

            // 3. Ambient soft aura pulse
            const auraLoop = Animated.loop(
                Animated.sequence([
                    Animated.timing(auraPulse, {
                        toValue: 1.25,
                        duration: 1600,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(auraPulse, {
                        toValue: 0.85,
                        duration: 1600,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            );
            auraLoop.start();

            // 4. Text gentle breathing
            const textLoop = Animated.loop(
                Animated.sequence([
                    Animated.timing(textOpacity, {
                        toValue: 1,
                        duration: 1000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(textOpacity, {
                        toValue: 0.65,
                        duration: 1000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            );
            textLoop.start();

            return () => {
                masterLoop.stop();
                spinLoop.stop();
                auraLoop.stop();
                textLoop.stop();
            };
        }
    }, [visible]);

    if (!visible) return null;

    // Spin interpolation (0 to 360 deg)
    const spinRotate = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    /**
     * Compute dynamic X, Y, Scale for each of the 4 dots across the 4 choreography phases:
     * Phase 0 (0->1): Swirling Orbit / Diamond Ring
     * Phase 1 (1->2): Horizontal Fluid Wave Bounce
     * Phase 2 (2->3): Diagonal Infinity / Cross Morph
     * Phase 3 (3->4): Convergence into Center Pulse & Explode
     */
    const renderDots = () => {
        return DOT_THEMES.map((theme, i) => {
            // Base angle offset for 4 corners (0, 90, 180, 270 deg)
            const angleDeg = i * 90;
            const rad = (angleDeg * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            // Phase 0: Ring radius 26px
            const p0_x = cos * 26;
            const p0_y = sin * 26;

            // Phase 1: Line Wave (x spaced from -36 to +36, y bouncing staggered)
            const lineX = -36 + i * 24;
            const waveY = (i % 2 === 0 ? -14 : 14);

            // Phase 2: Diagonal X-cross (corners)
            const diagX = (i === 0 || i === 3 ? -22 : 22);
            const diagY = (i === 0 || i === 1 ? -22 : 22);

            // Phase 3: Core convergence (0,0) -> burst to (32, 32)
            const burstX = cos * 34;
            const burstY = sin * 34;

            // Interpolate X position across master progress [0, 1, 2, 3, 4]
            const translateX = masterAnim.interpolate({
                inputRange: [0, 0.8, 1, 1.8, 2, 2.8, 3, 3.5, 4],
                outputRange: [p0_x, p0_x, lineX, lineX, diagX, diagX, 0, burstX, p0_x],
            });

            // Interpolate Y position across master progress [0, 1, 2, 3, 4]
            const translateY = masterAnim.interpolate({
                inputRange: [0, 0.8, 1, 1.4, 1.8, 2, 2.8, 3, 3.5, 4],
                outputRange: [p0_y, p0_y, waveY, -waveY, waveY, diagY, diagY, 0, burstY, p0_y],
            });

            // Interpolate Scale across master progress
            const scale = masterAnim.interpolate({
                inputRange: [0, 0.5, 1, 1.4, 2, 2.5, 3, 3.4, 4],
                outputRange: [1, 1.3, 0.95, 1.4, 1.1, 1.25, 0.7, 1.5, 1],
            });

            // Dot opacity
            const opacity = masterAnim.interpolate({
                inputRange: [0, 1, 2, 2.9, 3.1, 3.5, 4],
                outputRange: [0.95, 1, 0.95, 0.7, 1, 1, 0.95],
            });

            return (
                <Animated.View
                    key={i}
                    style={[
                        styles.dotWrapper,
                        {
                            transform: [{ translateX }, { translateY }, { scale }],
                            opacity,
                        },
                    ]}
                >
                    <LinearGradient
                        colors={[theme.primary, theme.secondary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.dot, { shadowColor: theme.primary }]}
                    />
                </Animated.View>
            );
        });
    };

    return (
        <Modal transparent visible={visible} animationType="fade" statusBarTranslucent pointerEvents="auto">
            <View style={styles.overlay}>
                {/* Center stage — Pure Floating Morphing Dots */}
                <View style={styles.centerStage}>
                    {/* Rotating motion anchor */}
                    <Animated.View
                        style={[
                            styles.motionAnchor,
                            {
                                transform: [{ rotate: spinRotate }],
                            },
                        ]}
                    >
                        {renderDots()}
                    </Animated.View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.05)', // Transparent overlay that completely blocks user interaction across the app
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerStage: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 100,
        height: 100,
    },
    motionAnchor: {
        width: 100,
        height: 100,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    dotWrapper: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dot: {
        width: 15,
        height: 15,
        borderRadius: 7.5,
        elevation: 10,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.45,
        shadowRadius: 6,
    },
});



