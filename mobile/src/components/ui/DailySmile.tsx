import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const SMILES = [
    {
        emoji: '😂',
        title: 'Today\'s Smile',
        message: 'Sir... today\'s mission: collect dues before tenants collect new excuses! 😄',
        category: 'Funny'
    },
    {
        emoji: '📶',
        title: 'Management Wisdom',
        message: 'Wi-Fi slow ani complaint vasthe... meelo unna \'Pushpa\' ni bayataki tiyyakandi, just router restart cheyyandi! Stay cool and happy managing. 😅',
        category: 'Funny'
    },
    {
        emoji: '💪',
        title: 'Motivation',
        message: 'Running a hostel is 10% rent collection and 90% acting like a peacemaker between roommates. You got this! ✌️',
        category: 'Motivation'
    },
    {
        emoji: '🍳',
        title: 'Food for Thought',
        message: 'Sunday morning breakfast menu marchadam... adhi oka pedda Baahubali task lanti twist. Keep them happy! 😋',
        category: 'Hostel Life'
    }
];

export const DailySmile = () => {
    const { isDark, theme } = useTheme();
    const [smile, setSmile] = useState(SMILES[0]);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Pick a random smile every day (or just random for now)
        const randomIndex = Math.floor(Math.random() * SMILES.length);
        setSmile(SMILES[randomIndex]);
    }, []);

    if (!isVisible) return null;

    return (
        <View style={[S.container, { backgroundColor: isDark ? '#1E293B' : '#FFFBEB', borderColor: isDark ? '#334155' : '#FEF3C7' }]}>
            <View style={S.header}>
                <View style={S.titleRow}>
                    <Text style={S.emoji}>{smile.emoji}</Text>
                    <Text style={[S.title, { color: isDark ? '#FCD34D' : '#D97706' }]}>{smile.title}</Text>
                </View>
                <TouchableOpacity onPress={() => setIsVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close" size={18} color={isDark ? '#94A3B8' : '#D97706'} />
                </TouchableOpacity>
            </View>
            <Text style={[S.message, { color: isDark ? '#E2E8F0' : '#92400E' }]}>
                {smile.message}
            </Text>
        </View>
    );
};

const S = StyleSheet.create({
    container: {
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    emoji: {
        fontSize: 16,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
    }
});
