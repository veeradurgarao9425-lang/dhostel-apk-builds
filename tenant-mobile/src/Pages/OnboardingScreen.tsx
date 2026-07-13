import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'Experience Hostel Life like never before',
        titleHighlight: 'never',
        subtitle: 'Welcome to your Dashboard',
        description: 'Your all-in-one companion to simplify your stay, rent, and daily hostel activities.',
        color: '#6366F1', // Indigo
        image: require('../../assets/hostel_only_3d.png'),
        features: [
            { icon: 'bed', label: 'My Room', color: '#6366F1', bg: '#E0E7FF' },
            { icon: 'restaurant', label: 'Mess Menu', color: '#10B981', bg: '#ECFDF5' },
            { icon: 'chatbubbles', label: 'Complaints', color: '#EF4444', bg: '#FEF2F2' },
            { icon: 'megaphone', label: 'Notices', color: '#D97706', bg: '#FEF3C7' },
        ]
    },
    {
        id: '2',
        title: 'Master your Finances & Dues instantly',
        titleHighlight: 'instantly',
        subtitle: 'Budgets & Splits',
        description: 'Set monthly budgets, seamlessly split bills with roommates, and track pending dues.',
        color: '#F43F5E', // Rose
        image: require('../../assets/payments_3d.png'),
        features: [
            { icon: 'pie-chart', label: 'Budgets', color: '#F43F5E', bg: '#FFE4E6' },
            { icon: 'people', label: 'Splits', color: '#10B981', bg: '#ECFDF5' },
            { icon: 'wallet', label: 'Dues', color: '#6366F1', bg: '#E0E7FF' },
            { icon: 'cash', label: 'Expenses', color: '#D97706', bg: '#FEF3C7' },
        ]
    },
    {
        id: '3',
        title: 'Never miss an update with Smart Alerts',
        titleHighlight: 'Smart',
        subtitle: 'Real-Time Notifications',
        description: 'Get instant push notifications for rent dues, bill splits, and important hostel announcements.',
        color: '#F59E0B', // Amber
        image: require('../../assets/notices_3d.png'),
        features: [
            { icon: 'notifications', label: 'Notices', color: '#F59E0B', bg: '#FEF3C7' },
            { icon: 'alert-circle', label: 'Due Alerts', color: '#F43F5E', bg: '#FFE4E6' },
            { icon: 'git-network', label: 'Split Alerts', color: '#6366F1', bg: '#E0E7FF' },
            { icon: 'time', label: 'Reminders', color: '#10B981', bg: '#ECFDF5' },
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
            await AsyncStorage.setItem('hasSeenOnboarding', 'true');
            navigation.replace('Main');
        }
    };

    const handleSkip = async () => {
        await AsyncStorage.setItem('hasSeenOnboarding', 'true');
        navigation.replace('Main');
    };

    return (
        <View style={styles.container}>
            <View style={{ height: insets.top + 20 }} />

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
                    onMomentumScrollEnd={(e) => {
                        setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
                    }}
                    renderItem={({ item, index }) => {
                        const inputRange = [
                            (index - 1) * width,
                            index * width,
                            (index + 1) * width
                        ];
                        const textTranslateY = scrollX.interpolate({
                            inputRange,
                            outputRange: [100, 0, 100],
                            extrapolate: 'clamp'
                        });
                        const cardsTranslateY = scrollX.interpolate({
                            inputRange,
                            outputRange: [150, 0, 150],
                            extrapolate: 'clamp'
                        });
                        const imageScale = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.8, 1, 0.8],
                            extrapolate: 'clamp'
                        });

                        const titleParts = item.title.split(item.titleHighlight);

                        const CardsRow = (
                            <Animated.View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: index !== 0 ? 24 : 0, marginBottom: index === 0 ? 10 : 0, transform: [{ translateY: cardsTranslateY }] }}>
                                {item.features.map((feature, i) => (
                                    <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                                        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: feature.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                                            <Ionicons name={feature.icon as any} size={20} color={feature.color} />
                                        </View>
                                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E293B', textAlign: 'center' }}>{feature.label}</Text>
                                    </View>
                                ))}
                            </Animated.View>
                        );

                        return (
                            <View style={{ width, height: '100%', backgroundColor: '#F8FAFC', paddingHorizontal: 24, paddingTop: 10 }}>
                                {/* Top Text */}
                                <Animated.View style={{ transform: [{ translateY: textTranslateY }] }}>
                                    <Text style={{ color: item.color, fontSize: 14, fontWeight: '800', marginBottom: 8 }}>{item.subtitle}</Text>
                                    <Text style={{ color: '#0F172A', fontSize: 36, fontWeight: '900', lineHeight: 44 }}>
                                        {titleParts[0]}
                                        <Text style={{ color: item.color, textDecorationLine: 'underline' }}>{item.titleHighlight}</Text>
                                        {titleParts[1]}
                                    </Text>
                                    <Text style={{ color: '#64748B', fontSize: 15, fontWeight: '500', marginTop: 12, lineHeight: 24, paddingRight: 40 }}>
                                        {item.description}
                                    </Text>
                                </Animated.View>

                                {/* If not first slide, put cards above the image */}
                                {index !== 0 && CardsRow}

                                {/* 3D Image */}
                                <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', transform: [{ scale: imageScale }] }}>
                                    <Image 
                                        source={item.image} 
                                        style={{ 
                                            width: index === 0 ? width * 1.1 : width * 0.85, 
                                            height: index === 0 ? width * 1.1 : width * 0.85, 
                                            resizeMode: 'contain' 
                                        }} 
                                    />
                                </Animated.View>

                                {/* If first slide, put cards below the image */}
                                {index === 0 && CardsRow}
                            </View>
                        );
                    }}
                />
            </View>

            {/* Bottom Container */}
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
        backgroundColor: '#F8FAFC',
    },
    bottomContainer: {
        width: '100%',
        paddingHorizontal: 24,
        backgroundColor: '#F8FAFC',
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
