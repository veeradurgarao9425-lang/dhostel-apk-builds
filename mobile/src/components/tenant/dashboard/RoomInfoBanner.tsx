import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { BedDouble, MapPin, Users, ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../../theme/tenantTheme';

interface RoomInfoBannerProps {
    roomNumber: string | null;
    bedNumber: string | null;
    hostelName: string | null;
    monthlyRent: number | null;
}

export const RoomInfoBanner = ({ roomNumber, bedNumber, hostelName, monthlyRent }: RoomInfoBannerProps) => {
    const navigation = useNavigation<any>();

    const scaleAnim = useRef(new Animated.Value(0.96)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        ]).start();
    }, []);

    if (!roomNumber) return null;

    return (
        <Animated.View style={[styles.wrapper, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => navigation.navigate('RoomInfo')}
                style={styles.card}
            >
                {/* Left: Room icon */}
                <View style={styles.roomIconWrap}>
                    <BedDouble size={22} color={theme.colors.primary} strokeWidth={2} />
                </View>

                {/* Middle: Info */}
                <View style={{ flex: 1 }}>
                    <View style={styles.topRow}>
                        <Text style={styles.roomNumber}>Room {roomNumber}</Text>
                        {bedNumber ? (
                            <View style={styles.bedBadge}>
                                <Text style={styles.bedBadgeText}>Bed {bedNumber}</Text>
                            </View>
                        ) : null}
                    </View>

                    <View style={styles.metaRow}>
                        {hostelName ? (
                            <View style={styles.metaItem}>
                                <MapPin size={10} color={theme.colors.textSubtle} strokeWidth={2} />
                                <Text style={styles.metaText} numberOfLines={1}>{hostelName}</Text>
                            </View>
                        ) : null}
                        {monthlyRent ? (
                            <View style={styles.metaItem}>
                                <Text style={styles.rentText}>₹{monthlyRent.toLocaleString('en-IN')}/mo</Text>
                            </View>
                        ) : null}
                    </View>
                </View>

                {/* Right arrow */}
                <View style={styles.arrowWrap}>
                    <ChevronRight size={16} color={theme.colors.primary} strokeWidth={2.5} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginHorizontal: 16,
        marginBottom: 14,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: theme.colors.surface,
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderWidth: 1.5,
        borderColor: theme.colors.primaryBorder,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius: 14,
        elevation: 3,
    },
    roomIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: theme.colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 5,
    },
    roomNumber: {
        fontSize: 17,
        fontWeight: '800',
        color: theme.colors.text,
        letterSpacing: -0.3,
    },
    bedBadge: {
        backgroundColor: theme.colors.primarySoft,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    bedBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textMuted,
        maxWidth: 150,
    },
    rentText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    arrowWrap: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: theme.colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
