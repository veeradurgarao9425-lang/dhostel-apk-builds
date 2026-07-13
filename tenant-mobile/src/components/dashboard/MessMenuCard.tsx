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

// Each meal: minimal accent, no giant color backgrounds
const MEAL_CONFIG: Record<string, {
    icon: keyof typeof Ionicons.glyphMap;
    emoji: string;
    accentColor: string;
    timeLabel: string;
}> = {
    morning: {
        icon: 'sunny-outline',
        emoji: '🌅',
        accentColor: '#D97706',
        timeLabel: '8:00 – 10:00 AM',
    },
    lunch: {
        icon: 'restaurant-outline',
        emoji: '☀️',
        accentColor: '#059669',
        timeLabel: '12:00 – 2:00 PM',
    },
    dinner: {
        icon: 'moon-outline',
        emoji: '🌙',
        accentColor: '#7C3AED',
        timeLabel: '8:00 – 11:00 PM',
    },
};

const TAB_LABELS: Record<string, string> = {
    morning: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
};

export const MessMenuCard = ({ meals, recentNotices, BLUE }: MessMenuCardProps) => {
    const navigation = useNavigation<any>();

    const hour = new Date().getHours();
    const defaultMeal: 'morning' | 'lunch' | 'dinner' =
        hour < 11 ? 'morning' : hour < 17 ? 'lunch' : 'dinner';
    const [activeMeal, setActiveMeal] = useState<'morning' | 'lunch' | 'dinner'>(defaultMeal);

    // Only animate meal-tab content switch, not card entry
    const contentFade = useRef(new Animated.Value(1)).current;

    const switchMeal = (key: 'morning' | 'lunch' | 'dinner') => {
        Animated.sequence([
            Animated.timing(contentFade, { toValue: 0, duration: 80, useNativeDriver: true }),
            Animated.timing(contentFade, { toValue: 1, duration: 180, useNativeDriver: true }),
        ]).start();
        setActiveMeal(key);
    };

    const activeMealData = meals.find(m => m.key === activeMeal);
    const activeCfg = MEAL_CONFIG[activeMeal];
    const isPlaceholder = !activeMealData?.sub || activeMealData.sub === 'Menu not updated';

    const foodItems = isPlaceholder
        ? []
        : (activeMealData?.sub || '').split(/[,\n]/).map(s => s.trim()).filter(Boolean);

    return (
        <View style={styles.wrapper}>
            <View style={styles.card}>

                {/* ── Card Header: title + Full Menu link (NO date badge) ── */}
                <View style={styles.cardHeader}>
                    <View style={styles.titleRow}>
                        <View style={styles.accentBar} />
                        <Text style={styles.cardTitle}>Today's Menu</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.fullMenuBtn}
                        onPress={() => navigation.navigate('FullMenu')}
                        activeOpacity={0.75}
                    >
                        <Text style={styles.fullMenuText}>Full Menu</Text>
                        <Ionicons name="chevron-forward" size={11} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* ── Meal Tabs — all same color until active (uniform purple) ── */}
                <View style={styles.tabRow}>
                    {(['morning', 'lunch', 'dinner'] as const).map((key) => {
                        const cfg = MEAL_CONFIG[key];
                        const isActive = key === activeMeal;
                        return (
                            <TouchableOpacity
                                key={key}
                                style={[
                                    styles.tab,
                                    isActive && styles.tabActive,
                                ]}
                                onPress={() => switchMeal(key)}
                                activeOpacity={0.75}
                            >
                                <Text style={styles.tabEmoji}>{cfg.emoji}</Text>
                                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                                    {TAB_LABELS[key]}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* ── Meal Content ── */}
                <Animated.View style={[styles.mealContent, { opacity: contentFade }]}>
                    {/* Time tag */}
                    <View style={styles.timeRow}>
                        <Ionicons name="time-outline" size={12} color={theme.colors.textSubtle} />
                        <Text style={styles.timeText}>{activeCfg.timeLabel}</Text>
                    </View>

                    {/* Food items */}
                    {isPlaceholder ? (
                        <TouchableOpacity
                            style={styles.emptyMenuBtn}
                            onPress={() => navigation.navigate('FullMenu')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="calendar-outline" size={14} color={theme.colors.primary} />
                            <Text style={styles.emptyMenuText}>View full week menu</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.chipsWrap}>
                            {foodItems.map((item: string, idx: number) => (
                                <View key={idx} style={styles.chip}>
                                    <Text style={styles.chipText}>{item}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </Animated.View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: 16,
        marginBottom: 4,
    },

    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1.5,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },

    // ── HEADER
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
    accentBar: {
        width: 3,
        height: 16,
        borderRadius: 2,
        backgroundColor: theme.colors.primary,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: theme.colors.text,
        letterSpacing: -0.5,
    },
    fullMenuBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    fullMenuText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.primary,
    },

    // ── TABS — uniform, pill style
    tabRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 14,
        backgroundColor: '#F4F4F8',
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
    tabActive: {
        backgroundColor: theme.colors.primary,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 3,
    },
    tabEmoji: {
        fontSize: 13,
    },
    tabText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textMuted,
    },
    tabTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },

    // ── MEAL CONTENT
    mealContent: {
        gap: 10,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timeText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textSubtle,
    },
    chipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    chip: {
        backgroundColor: theme.colors.primarySoft,
        paddingHorizontal: 11,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.primaryBorder,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.primaryDark,
    },
    emptyMenuBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        backgroundColor: theme.colors.primarySoft,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    emptyMenuText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.primary,
    },
});
