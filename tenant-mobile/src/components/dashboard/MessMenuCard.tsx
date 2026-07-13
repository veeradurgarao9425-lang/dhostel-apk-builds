import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme';

interface Meal {
    key: 'morning' | 'lunch' | 'dinner';
    title: string;
    sub: string;
    time: string;
    Icon: any;
    iconColor: string;
    iconBg: string;
}

interface MessMenuCardProps {
    meals: Meal[];
    recentNotices: any[];
    BLUE: string;
}

const MEAL_CONFIG: Record<string, { icon: string; color: string; soft: string; label: string }> = {
    morning: { icon: 'sunny',      color: '#EA580C', soft: '#FFF7ED', label: 'Breakfast' },
    lunch:   { icon: 'restaurant', color: '#16A34A', soft: '#DCFCE7', label: 'Lunch'     },
    dinner:  { icon: 'moon',       color: '#7C3AED', soft: '#EDE9FE', label: 'Dinner'    },
};

export const MessMenuCard = ({ meals, recentNotices, BLUE }: MessMenuCardProps) => {
    const navigation = useNavigation<any>();

    // Auto-select the current meal based on time
    const hour = new Date().getHours();
    const defaultMeal = hour < 11 ? 'morning' : hour < 17 ? 'lunch' : 'dinner';
    const [activeMeal, setActiveMeal] = useState<'morning' | 'lunch' | 'dinner'>(defaultMeal);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(10)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 380, delay: 80, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10, delay: 80 }),
        ]).start();
    }, []);

    // Animate tab switch
    const contentFade = useRef(new Animated.Value(1)).current;
    const switchMeal = (key: 'morning' | 'lunch' | 'dinner') => {
        Animated.sequence([
            Animated.timing(contentFade, { toValue: 0, duration: 100, useNativeDriver: true }),
            Animated.timing(contentFade, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
        setActiveMeal(key);
    };

    const activeMealData = meals.find(m => m.key === activeMeal);
    const activeCfg = MEAL_CONFIG[activeMeal];
    const isPlaceholder = !activeMealData?.sub || activeMealData.sub === 'Menu not updated';

    return (
        <Animated.View style={[styles.wrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* ══════════════════════════════════════════════
                TODAY'S MENU CARD
            ══════════════════════════════════════════════ */}
            <View style={styles.card}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                    <View style={styles.titleRow}>
                        <View style={styles.sectionDot} />
                        <Text style={styles.cardTitle}>Today's Menu</Text>
                        <View style={styles.dateBadge}>
                            <Text style={styles.dateBadgeText}>
                                {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate('FullMenu')}>
                        <Text style={styles.viewAllText}>Full Menu</Text>
                        <Ionicons name="chevron-forward" size={12} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* ── Meal Tab Switcher ── */}
                <View style={styles.tabRow}>
                    {meals.map((meal) => {
                        const cfg = MEAL_CONFIG[meal.key];
                        const isActive = meal.key === activeMeal;
                        return (
                            <TouchableOpacity
                                key={meal.key}
                                style={[
                                    styles.tab,
                                    isActive && { backgroundColor: cfg.color },
                                ]}
                                onPress={() => switchMeal(meal.key)}
                                activeOpacity={0.8}
                            >
                                <Ionicons
                                    name={cfg.icon as any}
                                    size={13}
                                    color={isActive ? '#FFFFFF' : theme.colors.textMuted}
                                />
                                <Text style={[styles.tabText, isActive && { color: '#FFFFFF' }]}>
                                    {cfg.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* ── Active Meal Content ── */}
                <Animated.View style={[styles.mealContent, { opacity: contentFade }]}>
                    {/* Time row */}
                    <View style={[styles.timePill, { backgroundColor: activeCfg.soft }]}>
                        <Ionicons name="time-outline" size={13} color={activeCfg.color} />
                        <Text style={[styles.timePillText, { color: activeCfg.color }]}>
                            {activeMealData?.time}
                        </Text>
                    </View>

                    {/* Food chips */}
                    {isPlaceholder ? (
                        <TouchableOpacity
                            style={styles.viewMenuBtn}
                            onPress={() => navigation.navigate('FullMenu')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="eye-outline" size={13} color={theme.colors.primary} />
                            <Text style={styles.viewMenuText}>Tap to view full menu</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.chipsWrap}>
                            {(activeMealData?.sub || '')
                                .split(/[,\n]/)
                                .map((item: string) => item.trim())
                                .filter((item: string) => item.length > 0)
                                .map((item: string, idx: number) => (
                                    <View key={idx} style={[styles.chip, { backgroundColor: activeCfg.soft }]}>
                                        <Text style={[styles.chipText, { color: activeCfg.color }]}>{item}</Text>
                                    </View>
                                ))
                            }
                        </View>
                    )}
                </Animated.View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: 16,
        gap: 10,
        marginBottom: 8,
    },

    // ── TODAY'S MENU CARD
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.colors.borderSoft,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 14,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionDot: {
        width: 4,
        height: 16,
        borderRadius: 2,
        backgroundColor: theme.colors.primary,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: theme.colors.text,
        letterSpacing: -0.2,
    },
    dateBadge: {
        backgroundColor: theme.colors.primarySoft,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    dateBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    viewAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    viewAllText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.primary,
    },

    // ── TAB SWITCHER
    tabRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 8,
        borderRadius: 9,
    },
    tabText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textMuted,
    },

    // ── MEAL CONTENT
    mealContent: {
        gap: 12,
    },
    timePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    timePillText: {
        fontSize: 12,
        fontWeight: '700',
    },
    chipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 7,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '700',
    },
    viewMenuBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: theme.colors.primarySoft,
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    viewMenuText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.primary,
    },

    // ── NOTICE ROW
    noticeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        paddingVertical: 13,
        paddingRight: 12,
        paddingLeft: 16,
        borderWidth: 1,
        borderColor: '#FDE68A',
        shadowColor: '#D97706',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 2,
        overflow: 'hidden',
    },
    noticeStripe: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        backgroundColor: '#D97706',
    },
    noticeIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#FEF3C7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    noticeTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    noticeTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: theme.colors.text,
        flexShrink: 1,
    },
    noticeBody: {
        fontSize: 12,
        fontWeight: '500',
        color: theme.colors.textMuted,
    },
    noticeArrow: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: theme.colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
    },
    newChip: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 5,
    },
    newChipText: {
        color: '#92400E',
        fontSize: 8,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
});
