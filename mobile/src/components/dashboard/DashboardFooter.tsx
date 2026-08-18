import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ImageBackground,
    FlatList,
    Dimensions,
    TouchableOpacity,
    NativeSyntheticEvent,
    NativeScrollEvent
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = Math.round(CARD_WIDTH * (682 / 1024));

interface SlideItem {
    id: string;
    type: 'custom_building' | 'image_banner';
    source?: any;
}

const SLIDES: SlideItem[] = [
    {
        id: 'slide_main_building',
        type: 'custom_building',
    },
    {
        id: 'banner_2',
        type: 'image_banner',
        source: require('../../../assets/hostix_banner_2.jpeg'),
    },
    {
        id: 'banner_1',
        type: 'image_banner',
        source: require('../../../assets/hostix_banner_1.jpeg'),
    },
    {
        id: 'banner_3',
        type: 'image_banner',
        source: require('../../../assets/hostix_banner_3.jpeg'),
    },
];

export const DashboardFooter: React.FC = () => {
    const { isDark } = useTheme();
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);

    // Auto-advance slides every 5 seconds
    useEffect(() => {
        startAutoScroll();
        return () => stopAutoScroll();
    }, [activeIndex]);

    const startAutoScroll = () => {
        stopAutoScroll();
        autoScrollTimer.current = setTimeout(() => {
            const nextIndex = (activeIndex + 1) % SLIDES.length;
            goToSlide(nextIndex);
        }, 5000);
    };

    const stopAutoScroll = () => {
        if (autoScrollTimer.current) {
            clearTimeout(autoScrollTimer.current);
            autoScrollTimer.current = null;
        }
    };

    const goToSlide = (index: number) => {
        if (index < 0 || index >= SLIDES.length) return;
        flatListRef.current?.scrollToIndex({
            index,
            animated: true,
        });
        setActiveIndex(index);
    };

    const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const contentOffset = e.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffset / CARD_WIDTH);
        if (index >= 0 && index < SLIDES.length) {
            setActiveIndex(index);
        }
    };

    const renderSlide = ({ item }: { item: SlideItem }) => {
        if (item.type === 'custom_building') {
            return (
                <View style={[styles.cardWrapper, { backgroundColor: '#0F172A', borderColor: isDark ? '#334155' : 'rgba(99, 102, 241, 0.2)' }]}>
                    <ImageBackground
                        source={require('../../../assets/hostix_building.jpeg')}
                        style={styles.cardBgImage}
                        imageStyle={styles.bgImageStyle}
                        resizeMode="cover"
                    >
                        <LinearGradient
                            colors={[
                                'rgba(10, 15, 30, 0.92)',
                                'rgba(10, 15, 30, 0.70)',
                                'rgba(10, 15, 30, 0.25)',
                                'transparent'
                            ]}
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 0.8, y: 0.5 }}
                            style={styles.gradientOverlay}
                        >
                            {/* Top Branding Section */}
                            <View style={styles.brandingContent}>
                                <View style={styles.logoContainer}>
                                    <Image
                                        source={require('../../../assets/HostixNew.png')}
                                        style={styles.logoImage}
                                        resizeMode="cover"
                                    />
                                </View>

                                <Text style={styles.brandTitle}>
                                    Host<Text style={{ color: '#FCD34D' }}>ix</Text>{' '}
                                    <Text style={{ color: '#C084FC', fontWeight: '900' }}>PG</Text>
                                </Text>

                                <Text style={styles.brandTagline}>
                                    Smart PG & Hostel Management
                                </Text>
                            </View>

                            {/* Bottom Feature Badges */}
                            <View style={styles.trustBadgesRow}>
                                <View style={styles.trustChip}>
                                    <Ionicons name="shield-checkmark" size={13} color="#10B981" />
                                    <Text style={styles.trustChipText}>100% Secure</Text>
                                </View>

                                <View style={styles.trustChip}>
                                    <Ionicons name="cloud-done" size={13} color="#38BDF8" />
                                    <Text style={styles.trustChipText}>Auto Synced</Text>
                                </View>

                                <View style={styles.trustChip}>
                                    <Ionicons name="receipt" size={13} color="#C084FC" />
                                    <Text style={styles.trustChipText}>Smart Receipts</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </ImageBackground>
                </View>
            );
        }

        return (
            <View style={[styles.cardWrapper, styles.imageCardContainer]}>
                <Image
                    source={item.source}
                    style={styles.imageCardStyle}
                    resizeMode="contain"
                />
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Ambient Glow */}
            <LinearGradient
                colors={['transparent', 'rgba(99, 102, 241, 0.12)', 'rgba(124, 58, 237, 0.06)']}
                style={styles.ambientGlow}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            />

            {/* Carousel Slider */}
            <View style={styles.sliderContainer}>
                <FlatList
                    ref={flatListRef}
                    data={SLIDES}
                    renderItem={renderSlide}
                    keyExtractor={(item) => item.id}
                    horizontal
                    pagingEnabled
                    nestedScrollEnabled={true}
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={CARD_WIDTH}
                    decelerationRate="fast"
                    snapToAlignment="center"
                    getItemLayout={(_, index) => ({
                        length: CARD_WIDTH,
                        offset: CARD_WIDTH * index,
                        index,
                    })}
                    onMomentumScrollEnd={handleScrollEnd}
                    onTouchStart={stopAutoScroll}
                    onTouchEnd={startAutoScroll}
                    style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
                    contentContainerStyle={{ alignItems: 'center' }}
                />
            </View>

            {/* Carousel Pagination Dots */}
            <View style={styles.dotsRow}>
                {SLIDES.map((_, i) => (
                    <TouchableOpacity
                        key={i}
                        onPress={() => {
                            stopAutoScroll();
                            goToSlide(i);
                        }}
                        activeOpacity={0.7}
                        style={[
                            styles.dot,
                            activeIndex === i
                                ? styles.activeDot
                                : [styles.inactiveDot, { backgroundColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)' }]
                        ]}
                    />
                ))}
            </View>

            {/* Footer Trust Note & App Control */}
            <View style={styles.footerNoteWrap}>
                <Text style={[styles.footerNote, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Made with <Text style={{ color: '#EF4444' }}>❤️</Text> for Hostel Owners & Tenants
                </Text>
                <Text style={[styles.versionText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                    100% Under App Control • Version 1.0.0
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
        marginBottom: 20,
        position: 'relative',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    ambientGlow: {
        position: 'absolute',
        top: -20,
        left: 0,
        right: 0,
        height: 180,
    },
    sliderContainer: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        position: 'relative',
        justifyContent: 'center',
    },
    cardWrapper: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 5,
        backgroundColor: '#FFFFFF',
    },
    imageCardContainer: {
        borderWidth: 0,
        backgroundColor: 'transparent',
        shadowOpacity: 0,
        elevation: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageCardStyle: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
    },
    cardBgImage: {
        width: '100%',
        height: '100%',
    },
    bgImageStyle: {
        borderRadius: 21,
    },
    gradientOverlay: {
        flex: 1,
        padding: 16,
        justifyContent: 'space-between',
    },
    brandingContent: {
        maxWidth: '68%',
    },
    logoContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    logoImage: {
        width: '100%',
        height: '100%',
    },
    brandTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    brandTagline: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.95)',
        marginTop: 2,
        lineHeight: 16,
    },
    trustBadgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'nowrap',
    },
    trustChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 12,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
    trustChipText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    dotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 12,
        marginBottom: 10,
    },
    dot: {
        height: 6,
        borderRadius: 3,
    },
    activeDot: {
        width: 22,
        backgroundColor: '#8B5CF6',
    },
    inactiveDot: {
        width: 6,
    },
    footerNoteWrap: {
        alignItems: 'center',
        gap: 4,
    },
    footerNote: {
        fontSize: 12,
        fontWeight: '500',
    },
    versionText: {
        fontSize: 10.5,
        fontWeight: '500',
    },
});

export default DashboardFooter;
