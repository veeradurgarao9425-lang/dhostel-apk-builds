import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Megaphone, ArrowRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

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

export const MessMenuCard = ({ meals, recentNotices, BLUE }: MessMenuCardProps) => {
    const navigation = useNavigation<any>();

    return (
        <View style={{ marginBottom: 24 }}>
            {/* 1. Today's Menu Stacked Cards */}
            <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Today's Menu</Text>
                        <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: BLUE }}>
                                {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => navigation.navigate("FullMenu")}>
                        <Text style={{ fontSize: 13, color: BLUE, fontWeight: '700' }}>View All</Text>
                        <ArrowRight size={14} color={BLUE} strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>

                <View style={{ gap: 12 }}>
                    {meals.map((meal, idx) => {
                        const MealIcon = meal.Icon;
                        let colors = ['#FFF7ED', '#FFEDD5']; let iconWrapBg = 'rgba(234, 88, 12, 0.12)'; let color = '#EA580C'; // Morning
                        if (meal.key === 'lunch') { colors = ['#FEF2F2', '#FEE2E2']; iconWrapBg = 'rgba(239, 68, 68, 0.12)'; color = '#EF4444'; }
                        if (meal.key === 'dinner') { colors = ['#F0FDF4', '#DCFCE7']; iconWrapBg = 'rgba(16, 185, 129, 0.12)'; color = '#10B981'; }

                        const isPlaceholder = !meal.sub || meal.sub === 'Menu not updated';
                        const displaySub = isPlaceholder ? 'Menu not updated' : meal.sub;

                        return (
                            <TouchableOpacity
                                key={idx}
                                activeOpacity={0.9}
                                onPress={() => navigation.navigate("FullMenu")}
                            >
                                <LinearGradient
                                    colors={colors}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={{
                                        borderRadius: 20,
                                        padding: 16,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        borderWidth: 1,
                                        borderColor: 'rgba(255,255,255,0.6)',
                                        shadowColor: color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2,
                                    }}
                                >
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 }}>
                                    <View style={{ backgroundColor: iconWrapBg, width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }}>
                                        <MealIcon size={24} color={color} />
                                    </View>
                                    <View style={{ flex: 1, paddingRight: 8 }}>
                                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 2 }}>{meal.title}</Text>
                                        <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '500' }} numberOfLines={1}>{displaySub}</Text>
                                    </View>
                                </View>
                                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: color }}>{meal.time.split(' - ')[0]}</Text>
                                    <View style={{ backgroundColor: '#FFFFFF', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
                                        <ArrowRight size={14} color={color} strokeWidth={2.5} />
                                    </View>
                                </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* 2. Notice Card */}
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigation.navigate("Notices")}
                style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 20,
                    padding: 16,
                    borderWidth: 1, borderColor: '#F1F5F9',
                    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 16
                }}
            >
                <View style={[styles.cardIconWrap, { backgroundColor: '#EEF2FF', width: 48, height: 48, borderRadius: 14 }]}>
                    <Megaphone size={24} color={BLUE} />
                </View>
                {recentNotices.length > 0 ? (
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '800', flexShrink: 1 }} numberOfLines={1}>
                                {recentNotices[0]?.title || "Welcome!"}
                            </Text>
                            <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                <Text style={{ color: BLUE, fontSize: 9, fontWeight: '800', textTransform: 'uppercase' }}>New</Text>
                            </View>
                        </View>
                        <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '500' }} numberOfLines={2}>
                            {recentNotices[0]?.body || "Check here for daily updates."}
                        </Text>
                    </View>
                ) : (
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '800', marginBottom: 2 }}>Notices</Text>
                        <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '500' }}>No new notices at the moment</Text>
                    </View>
                )}
                <View style={{ backgroundColor: '#F8FAFC', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }}>
                    <ArrowRight size={16} color="#64748B" strokeWidth={2.5} />
                </View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    cardIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
