import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

const HOME_TIPS = [
    {
        id: '1',
        title: 'Save on Electricity',
        desc: 'Turn off lights and fans when you leave your room to help the hostel save energy.',
        icon: 'flash',
        colors: ['#FFFBEB', '#FEF3C7'],
        iconColor: '#D97706',
    },
    {
        id: '2',
        title: 'Pay Rent on Time',
        desc: 'Avoid late fees by setting a reminder to pay your monthly rent before the 5th.',
        icon: 'calendar',
        colors: ['#F0FDF4', '#DCFCE7'],
        iconColor: '#16A34A',
    },
    {
        id: '3',
        title: 'Track Your Daily Spending',
        desc: 'Log food, travel, and personal expenses in the app. See exactly where your money goes each month.',
        icon: 'wallet',
        colors: ['#F5F3FF', '#EDE9FE'],
        iconColor: '#7C3AED',
    },
    {
        id: '4',
        title: 'Split Bills with Roommates',
        desc: 'Use the Splits feature to divide shared expenses like grocery, electricity, or subscriptions fairly.',
        icon: 'receipt',
        colors: ['#FFF7ED', '#FFEDD5'],
        iconColor: '#EA580C',
    },
    {
        id: '5',
        title: 'Report Issues Quickly',
        desc: 'Use the Complaints section to immediately notify management about any maintenance issues.',
        icon: 'construct',
        colors: ['#EEF2FF', '#E0E7FF'],
        iconColor: '#4F46E5',
    },
];


export interface Tip {
    id: string;
    title: string;
    desc: string;
    icon: string;
    colors: string[];
    iconColor: string;
}

interface QuickTipsProps {
    tips?: Tip[];
}

export const QuickTips = ({ tips = HOME_TIPS }: QuickTipsProps) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef<FlatList>(null);

    // Auto-scroll logic
    useEffect(() => {
        const timer = setInterval(() => {
            if (flatListRef.current) {
                const nextIndex = (currentIndex + 1) % tips.length;
                flatListRef.current.scrollToIndex({
                    index: nextIndex,
                    animated: true,
                });
                setCurrentIndex(nextIndex);
            }
        }, 8000); // swipe every 8 seconds

        return () => clearInterval(timer);
    }, [currentIndex, tips.length]);

    const handleScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: false }
    );

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const renderItem = ({ item }: { item: typeof TIPS[0] }) => (
        <View style={styles.cardContainer}>
            <LinearGradient
                colors={item.colors}
                style={styles.card}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,255,255,0.6)' }]}>
                    <Ionicons name={item.icon as any} size={24} color={item.iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: item.iconColor }]}>{item.title}</Text>
                    <Text style={styles.desc}>{item.desc}</Text>
                </View>
            </LinearGradient>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <View style={styles.sectionDot} />
                    <Text style={styles.sectionTitle}>Quick Tips</Text>
                </View>
                <Ionicons name="bulb" size={18} color="#EAB308" />
            </View>

            <View style={styles.carouselWrap}>
                <FlatList
                    ref={flatListRef}
                    data={tips}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewConfigRef}
                    scrollEventThrottle={16}
                    contentContainerStyle={{ paddingHorizontal: 0 }}
                />

                {/* Dot Indicators */}
                <View style={styles.pagination}>
                    {tips.map((_, index) => {
                        const widthAnim = scrollX.interpolate({
                            inputRange: [(index - 1) * CARD_WIDTH, index * CARD_WIDTH, (index + 1) * CARD_WIDTH],
                            outputRange: [6, 18, 6],
                            extrapolate: 'clamp',
                        });
                        const colorAnim = scrollX.interpolate({
                            inputRange: [(index - 1) * CARD_WIDTH, index * CARD_WIDTH, (index + 1) * CARD_WIDTH],
                            outputRange: ['#D1D5DB', theme.colors.primary, '#D1D5DB'],
                            extrapolate: 'clamp',
                        });

                        return (
                            <Animated.View
                                key={index}
                                style={[
                                    styles.dot,
                                    { width: widthAnim, backgroundColor: colorAnim },
                                ]}
                            />
                        );
                    })}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionDot: {
        width: 4,
        height: 18,
        borderRadius: 2,
        backgroundColor: theme.colors.primary,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: theme.colors.text,
        letterSpacing: -0.3,
    },
    carouselWrap: {
        alignItems: 'center',
    },
    cardContainer: {
        width: CARD_WIDTH,
        marginHorizontal: 16, // center it properly if container doesn't have horizontal padding
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    iconWrap: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 4,
    },
    desc: {
        fontSize: 12,
        color: theme.colors.textSubtle,
        fontWeight: '500',
        lineHeight: 18,
    },
    pagination: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        gap: 6,
    },
    dot: {
        height: 6,
        borderRadius: 3,
    },
});
