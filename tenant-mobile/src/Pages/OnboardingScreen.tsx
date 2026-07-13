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
        title: 'Manage your Hostel like never before',
        titleHighlight: 'never',
        subtitle: 'Welcome to DHostel',
        description: 'All-in-one platform to simplify rooms, tenants, payments and more.',
        color: '#6366F1', // Indigo
        image: require('../../assets/durgarao_hostel_3d.png'),
        features: [
            { icon: 'business', label: 'Rooms', color: '#6366F1', bg: '#E0E7FF' },
            { icon: 'people', label: 'Tenants', color: '#10B981', bg: '#ECFDF5' },
            { icon: 'card', label: 'Payments', color: '#EF4444', bg: '#FEF2F2' },
            { icon: 'pie-chart', label: 'Reports', color: '#D97706', bg: '#FEF3C7' },
        ]
    },
    {
        id: '2',
        title: 'Track your Dues & Expenses instantly',
        titleHighlight: 'instantly',
        subtitle: 'Digital Payments',
        description: 'Never miss a rent payment. View your due amounts, history, and daily limits on the go.',
        color: '#F43F5E', // Rose
        image: require('../../assets/payments_3d.png'),
        features: [
            { icon: 'wallet', label: 'Dues', color: '#F43F5E', bg: '#FFE4E6' },
            { icon: 'cash', label: 'Expenses', color: '#10B981', bg: '#ECFDF5' },
            { icon: 'time', label: 'History', color: '#6366F1', bg: '#E0E7FF' },
            { icon: 'trending-up', label: 'Limits', color: '#D97706', bg: '#FEF3C7' },
        ]
    },
    {
        id: '3',
        title: 'Stay updated with your Hostel Feed',
        titleHighlight: 'updated',
        subtitle: 'Community & Notices',
        description: 'Get instant announcements, mess menus, and maintenance updates right on your phone.',
        color: '#F59E0B', // Amber
        image: require('../../assets/notices_3d.png'),
        features: [
            { icon: 'megaphone', label: 'Notices', color: '#F59E0B', bg: '#FEF3C7' },
            { icon: 'restaurant', label: 'Menu', color: '#F43F5E', bg: '#FFE4E6' },
            { icon: 'chatbubbles', label: 'Complaints', color: '#6366F1', bg: '#E0E7FF' },
            { icon: 'construct', label: 'Updates', color: '#10B981', bg: '#ECFDF5' },
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

                                {/* 3D Image */}
                                <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', transform: [{ scale: imageScale }] }}>
                                    <Image 
                                        source={item.image} 
                                        style={{ width: width * 1.1, height: width * 1.1, resizeMode: 'contain' }} 
                                    />
                                </Animated.View>

                                {/* 4 Small Cards Row */}
                                <Animated.View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, transform: [{ translateY: cardsTranslateY }] }}>
                                    {item.features.map((feature, i) => (
                                        <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                                            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: feature.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                                                <Ionicons name={feature.icon as any} size={20} color={feature.color} />
                                            </View>
                                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E293B', textAlign: 'center' }}>{feature.label}</Text>
                                        </View>
                                    ))}
                                </Animated.View>
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
