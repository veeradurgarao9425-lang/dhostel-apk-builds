import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';

interface Props {
    route?: {
        params?: {
            featureName?: string;
            description?: string;
            icon?: string;
        };
    };
}

export default function ComingSoonScreen({ route }: Props) {
    const navigation = useNavigation<any>();
    const featureName = route?.params?.featureName || 'This Feature';
    const description =
        route?.params?.description ||
        'We are working hard to bring this feature to you. Stay tuned for the next update!';
    const iconName = (route?.params?.icon as any) || 'rocket-outline';

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" />

            <AppHeader title={featureName} />

            {/* Body */}
            <View style={s.body}>
                {/* Main icon circle */}
                <View style={s.iconOuter}>
                    <LinearGradient colors={['#EDE9FE', '#DDD6FE']} style={s.iconInner}>
                        <Ionicons name={iconName} size={52} color="#7C3AED" />
                    </LinearGradient>
                </View>

                {/* Coming soon badge */}
                <View style={s.badge}>
                    <Ionicons name="construct-outline" size={12} color="#7C3AED" />
                    <Text style={s.badgeText}>Under Development</Text>
                </View>

                <Text style={s.title}>Coming Soon!</Text>
                <Text style={s.featureName}>{featureName}</Text>
                <Text style={s.desc}>{description}</Text>

                {/* What to expect */}
                <View style={s.expectCard}>
                    <Text style={s.expectTitle}>What to expect</Text>
                    {[
                        'Seamlessly integrated with your hostel data',
                        'Simple and easy to use — no training needed',
                        'Available in the next update',
                    ].map((item, i) => (
                        <View key={i} style={s.expectRow}>
                            <View style={s.expectDot} />
                            <Text style={s.expectText}>{item}</Text>
                        </View>
                    ))}
                </View>

                {/* Go back button */}
                <TouchableOpacity
                    style={s.backButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.85}
                >
                    <LinearGradient colors={['#6D28D9', '#7C3AED']} style={s.backGradient}>
                        <Ionicons name="chevron-back-outline" size={18} color="#FFF" />
                        <Text style={s.backButtonText}>Go Back</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F8F7FF' },

    topBar: { paddingBottom: 16 },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 4,
    },
    backBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    topTitle: { fontSize: 17, fontWeight: '700', color: '#FFF' },

    body: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 40,
    },

    iconOuter: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#EDE9FE',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        shadowColor: '#7C3AED',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    iconInner: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },

    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#EDE9FE',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 5,
        marginBottom: 16,
    },
    badgeText: { fontSize: 11, fontWeight: '700', color: '#7C3AED' },

    title: { fontSize: 26, fontWeight: '900', color: '#1E293B', marginBottom: 4 },
    featureName: { fontSize: 15, fontWeight: '700', color: '#7C3AED', marginBottom: 10 },
    desc: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 28,
    },

    expectCard: {
        width: '100%',
        backgroundColor: '#FFF',
        borderRadius: 18,
        padding: 18,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#E9D5FF',
        elevation: 2,
        shadowColor: '#7C3AED',
        shadowOpacity: 0.06,
        shadowRadius: 8,
    },
    expectTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 12,
    },
    expectRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
        gap: 10,
    },
    expectDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#7C3AED',
        marginTop: 5,
    },
    expectText: { fontSize: 13, color: '#475569', flex: 1, lineHeight: 19 },

    backButton: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#7C3AED',
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    backGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
    },
    backButtonText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
});
