import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Megaphone, ArrowRight, Bell } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme';

interface MessMenuCardProps {
    meals: {
        key: "morning" | "lunch" | "dinner";
        title: string;
        sub: string;
        time: string;
        Icon: any;
        iconColor: string;
        iconBg: string;
    }[];
    recentNotices: any[];
    BLUE: string;
}

// Accent colors per meal
const MEAL_COLORS: Record<string, { accent: string; soft: string; gradient: [string, string] }> = {
    morning: { accent: '#F97316', soft: '#FFF7ED', gradient: ['#F97316', '#FB923C'] },
    lunch:   { accent: '#EF4444', soft: '#FEF2F2', gradient: ['#EF4444', '#F87171'] },
    dinner:  { accent: '#8B5CF6', soft: '#F5F3FF', gradient: ['#8B5CF6', '#A78BFA'] },
};

export const MessMenuCard = ({ meals, recentNotices, BLUE }: MessMenuCardProps) => {
    const navigation = useNavigation<any>();

    return (
        <View style={{ marginBottom: theme.spacing['2xl'] }}>
            {/* Today's Menu */}
            <View style={{ marginBottom: theme.spacing.xl }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md, paddingHorizontal: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.text }}>Today's Menu</Text>
                        <View style={{ backgroundColor: theme.colors.primarySoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary }}>
                                {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => navigation.navigate('FullMenu')}>
                        <Text style={{ fontSize: 13, color: theme.colors.primary, fontWeight: '700' }}>View All</Text>
                        <ArrowRight size={14} color={theme.colors.primary} strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>

                <View style={{ gap: theme.spacing.md }}>
                    {meals.map((meal, idx) => {
                        const MealIcon = meal.Icon;
                        const mc = MEAL_COLORS[meal.key] || MEAL_COLORS.morning;
                        const isPlaceholder = !meal.sub || meal.sub === 'Menu not updated';

                        return (
                            <TouchableOpacity
                                key={idx}
                                activeOpacity={0.9}
                                onPress={() => navigation.navigate('FullMenu')}
                                style={styles.mealCard}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14, paddingHorizontal: 16, paddingVertical: 14 }}>
                                    {/* Solid background icon */}
                                    <View style={[styles.mealIconWrap, { backgroundColor: mc.soft }]}>
                                        <MealIcon size={22} color={mc.accent} strokeWidth={2} />
                                    </View>

                                    {/* Text */}
                                    <View style={{ flex: 1, paddingRight: 8 }}>
                                        <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.text, marginBottom: 3 }}>{meal.title}</Text>
                                        {isPlaceholder ? (
                                            <Text style={{ fontSize: 13, color: theme.colors.primary, fontWeight: '600' }}>+ View menu</Text>
                                        ) : (
                                            <Text style={{ fontSize: 13, color: theme.colors.textMuted, fontWeight: '500' }} numberOfLines={1}>{meal.sub}</Text>
                                        )}
                                    </View>

                                    {/* Time badge */}
                                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                        <View style={[styles.timeBadge, { backgroundColor: theme.colors.primarySoft }]}>
                                            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary }}>{meal.time.split(' - ')[0]}</Text>
                                        </View>
                                        <View style={{ backgroundColor: theme.colors.surfaceAlt, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }}>
                                            <ArrowRight size={14} color={theme.colors.primary} strokeWidth={2.5} />
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Notice Board */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md, paddingHorizontal: 4, marginTop: 4 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.text }}>Notice Board</Text>
                {recentNotices.length > 0 && (
                    <View style={{ backgroundColor: theme.colors.dangerSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                        <Text style={{ color: theme.colors.danger, fontSize: 11, fontWeight: '700' }}>{recentNotices.length} new</Text>
                    </View>
                )}
            </View>

            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigation.navigate('Notices')}
                style={styles.noticeCard}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14, paddingHorizontal: 16, paddingVertical: 14 }}>
                    {/* Amber icon */}
                    <View style={[styles.mealIconWrap, { backgroundColor: '#FEF3C7' }]}>
                        <Megaphone size={22} color="#D97706" strokeWidth={2} />
                    </View>

                    {recentNotices.length > 0 ? (
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '800', flexShrink: 1 }} numberOfLines={1}>
                                    {recentNotices[0]?.title || 'New Notice'}
                                </Text>
                                <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                    <Text style={{ color: '#92400E', fontSize: 9, fontWeight: '800', textTransform: 'uppercase' }}>New</Text>
                                </View>
                            </View>
                            <Text style={{ color: theme.colors.textMuted, fontSize: 13, fontWeight: '500', lineHeight: 18 }} numberOfLines={2}>
                                {recentNotices[0]?.body || 'Check here for daily updates.'}
                            </Text>
                        </View>
                    ) : (
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '800', marginBottom: 3 }}>Notice Board</Text>
                            <Text style={{ color: theme.colors.textMuted, fontSize: 13, fontWeight: '500' }}>No new announcements right now</Text>
                        </View>
                    )}

                    <View style={{ backgroundColor: theme.colors.surfaceAlt, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }}>
                        <ArrowRight size={16} color={theme.colors.textMuted} strokeWidth={2.5} />
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    mealCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'stretch',
        borderWidth: 1,
        borderColor: theme.colors.borderSoft,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        overflow: 'hidden',
    },
    mealIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    noticeCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'stretch',
        borderWidth: 1,
        borderColor: '#FDE68A',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        overflow: 'hidden',
    },
    cardIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
