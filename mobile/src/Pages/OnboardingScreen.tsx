import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
export const ONBOARDING_KEY = 'hasSeenIntro';

// ── Responsive breakpoints (computed once at module level) ───────────────────
const isSmall = height < 700;  // iPhone SE, small Androids
const isTiny  = height < 600;  // very small screens

// Scale image so it never pushes content off on small phones
const IMG_SIZE = isTiny ? width * 0.52 : isSmall ? width * 0.62 : width * 0.78;
// Feature icon box
const ICON_BOX = isSmall ? 38 : 44;
// Title size
const TITLE_SIZE = isTiny ? 22 : isSmall ? 26 : 32;
const TITLE_LINE = isTiny ? 28 : isSmall ? 32 : 40;

const SLIDES = [
    {
        id: '1',
        title: 'Manage your PG like never before',
        titleHighlight: 'never',
        subtitle: 'Welcome to your Admin Dashboard',
        description: 'All-in-one platform to simplify rooms, tenants, collections and reports.',
        color: '#6366F1',
        image: require('../../assets/hostel_only_3d.png'),
        features: [
            { icon: 'business', label: 'Rooms', color: '#6366F1', bg: '#E0E7FF' },
            { icon: 'people', label: 'Tenants', color: '#10B981', bg: '#ECFDF5' },
            { icon: 'cash', label: 'Collect', color: '#EF4444', bg: '#FEF2F2' },
            { icon: 'pie-chart', label: 'Reports', color: '#D97706', bg: '#FEF3C7' },
        ]
    },
    {
        id: '2',
        title: 'Track & Collect Dues effortlessly',
        titleHighlight: 'effortlessly',
        subtitle: 'Digital Collections',
        description: 'Stay on top of outstanding payments, send reminders, and collect dues faster.',
        color: '#F43F5E',
        image: require('../../assets/payments_3d.png'),
        features: [
            { icon: 'wallet', label: 'Dues', color: '#F43F5E', bg: '#FFE4E6' },
            { icon: 'notifications', label: 'Reminds', color: '#10B981', bg: '#ECFDF5' },
            { icon: 'time', label: 'History', color: '#6366F1', bg: '#E0E7FF' },
            { icon: 'trending-up', label: 'Analytics', color: '#D97706', bg: '#FEF3C7' },
        ]
    },
    {
        id: '3',
        title: 'Stay in control with Live Updates',
        titleHighlight: 'Live',
        subtitle: 'Real-Time Alerts',
        description: 'Get instant push notifications for rent payments, complaints, and important updates.',
        color: '#F59E0B',
        image: require('../../assets/notices_3d.png'),
        features: [
            { icon: 'megaphone', label: 'Alerts', color: '#F59E0B', bg: '#FEF3C7' },
            { icon: 'chatbubbles', label: 'Issues', color: '#F43F5E', bg: '#FFE4E6' },
            { icon: 'construct', label: 'Fixes', color: '#6366F1', bg: '#E0E7FF' },
            { icon: 'shield-checkmark', label: 'Secure', color: '#10B981', bg: '#ECFDF5' },
        ]
    },
    {
        id: '4',
        title: 'Experience seamless PG living',
        titleHighlight: 'seamless',
        subtitle: 'Tenant App Features',
        description: 'Pay rent online, log complaints, check food menus, and stay updated with announcements.',
        color: '#0EA5E9',
        image: require('../../assets/tenant_3d.png'),
        features: [
            { icon: 'card', label: 'Rent', color: '#0EA5E9', bg: '#E0F2FE' },
            { icon: 'restaurant', label: 'Food', color: '#10B981', bg: '#ECFDF5' },
            { icon: 'chatbubbles', label: 'Issues', color: '#F43F5E', bg: '#FFE4E6' },
            { icon: 'newspaper', label: 'Notices', color: '#8B5CF6', bg: '#EDE9FE' },
        ]
    }
];

export default function OnboardingScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef<any>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleNext = async () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
        } else {
            await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
            navigation.replace('RoleSelect');
        }
    };

    const handleSkip = async () => {
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        navigation.replace('RoleSelect');
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems && viewableItems.length > 0 && viewableItems[0].index !== null) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    return (
        <View style={styles.container}>
            {/* Status bar safe area spacer — same as original */}
            <View style={{ height: insets.top + (isSmall ? 8 : 20) }} />

            <View style={{ flex: 1 }}>
                <Animated.FlatList
                    ref={flatListRef}
                    data={SLIDES}
                    keyExtractor={(item) => item.id}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    bounces={false}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                        { useNativeDriver: false }
                    )}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    getItemLayout={(_, index) => ({
                        length: width,
                        offset: width * index,
                        index,
                    })}
                    renderItem={({ item, index }) => {
                        const inputRange = [
                            (index - 1) * width,
                            index * width,
                            (index + 1) * width
                        ];
                        const textTranslateY = scrollX.interpolate({
                            inputRange,
                            outputRange: [50, 0, 50],
                            extrapolate: 'clamp'
                        });
                        const cardsTranslateY = scrollX.interpolate({
                            inputRange,
                            outputRange: [80, 0, 80],
                            extrapolate: 'clamp'
                        });
                        const imageScale = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.8, 1, 0.8],
                            extrapolate: 'clamp'
                        });

                        const titleParts = item.title.split(item.titleHighlight);

                        const CardsRow = (
                            <Animated.View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                marginTop: index !== 0 ? (isSmall ? 12 : 24) : 0,
                                marginBottom: index === 0 ? (isSmall ? 4 : 10) : 0,
                                transform: [{ translateY: cardsTranslateY }]
                            }}>
                                {item.features.map((feature, i) => (
                                    <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                                        <View style={{
                                            width: ICON_BOX,
                                            height: ICON_BOX,
                                            borderRadius: 11,
                                            backgroundColor: feature.bg,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginBottom: 6,
                                        }}>
                                            <Ionicons name={feature.icon as any} size={isSmall ? 17 : 20} color={feature.color} />
                                        </View>
                                        <Text style={{ fontSize: isSmall ? 10 : 11, fontWeight: '800', color: '#1E293B', textAlign: 'center' }}>
                                            {feature.label}
                                        </Text>
                                    </View>
                                ))}
                            </Animated.View>
                        );

                        return (
                            // Keep the same plain View structure as original — no ScrollView wrapper
                            <View style={{ width, height: '100%', backgroundColor: 'transparent', paddingHorizontal: 24, paddingTop: isSmall ? 6 : 10 }}>
                                {/* Top Text */}
                                <Animated.View style={{ transform: [{ translateY: textTranslateY }] }}>
                                    <Text style={{ color: item.color, fontSize: isSmall ? 12 : 14, fontWeight: '800', marginBottom: isSmall ? 5 : 8 }}>
                                        {item.subtitle}
                                    </Text>
                                    <Text style={{ color: '#0F172A', fontSize: TITLE_SIZE, fontWeight: '900', lineHeight: TITLE_LINE }}>
                                        {titleParts[0]}
                                        <Text style={{ color: item.color, textDecorationLine: 'underline' }}>{item.titleHighlight}</Text>
                                        {titleParts[1]}
                                    </Text>
                                    <Text style={{ color: '#64748B', fontSize: isSmall ? 13 : 15, fontWeight: '500', marginTop: isSmall ? 8 : 12, lineHeight: 22, paddingRight: 40 }}>
                                        {item.description}
                                    </Text>
                                </Animated.View>

                                {/* Cards above image (slides 2-4) */}
                                {index !== 0 && CardsRow}

                                {/* 3D Image — fixed size, transparent bg, centered */}
                                <Animated.View style={{
                                    flex: 1,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: 'transparent', // no separate bg box
                                    transform: [{ scale: imageScale }],
                                }}>
                                    <Image
                                        source={item.image}
                                        style={{
                                            width: IMG_SIZE,
                                            height: IMG_SIZE,
                                            resizeMode: 'contain',
                                        }}
                                    />
                                </Animated.View>

                                {/* Cards below image (slide 1 only) */}
                                {index === 0 && CardsRow}
                            </View>
                        );
                    }}
                />
            </View>

            {/* Bottom Container — same as original */}
            <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom + 20, 48) }]}>
                <View style={styles.pagination}>
                    {SLIDES.map((_, i) => {
                        const dotWidth = scrollX.interpolate({
                            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                            outputRange: [8, 32, 8],
                            extrapolate: 'clamp',
                        });
                        const opacity = scrollX.interpolate({
                            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });
                        return (
                            <Animated.View
                                key={i.toString()}
                                style={[styles.dot, { width: dotWidth, opacity, backgroundColor: SLIDES[currentIndex].color }]}
                            />
                        );
                    })}
                </View>

                <View style={styles.buttonRow}>
                    <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                        <Text style={styles.skipText}>Skip</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleNext}
                        activeOpacity={0.8}
                        style={[styles.nextBtn, { backgroundColor: SLIDES[currentIndex].color, shadowColor: SLIDES[currentIndex].color }]}
                    >
                        <Text style={styles.nextText}>{currentIndex === SLIDES.length - 1 ? "Let's Go!" : "Next"}</Text>
                        <Ionicons name={currentIndex === SLIDES.length - 1 ? "rocket" : "arrow-forward"} size={18} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    bottomContainer: {
        width: '100%',
        paddingHorizontal: 24,
        backgroundColor: '#FFFFFF',
    },
    pagination: {
        flexDirection: 'row',
        marginBottom: 32,
        justifyContent: 'center',
        gap: 8,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    skipBtn: {
        paddingVertical: 12,
        paddingRight: 20,
    },
    skipText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#94A3B8',
    },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 24,
        gap: 8,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    nextText: {
        fontSize: 16,
        fontWeight: '900',
        color: '#FFFFFF',
    },
});
