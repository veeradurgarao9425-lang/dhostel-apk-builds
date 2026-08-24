import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';

interface WarningCardsProps {
    data: {
        unallocatedCount: number;
        qrRegisterCount: number;
        openComplaintsCount: number;
        pendingAdmissionsCount: number;
        prebookingsCount?: number;
        vacateCount?: number;
        activeGuestsCount?: number;
    };
}

interface ChipItem {
    count: number;
    label: string;
    icon: any;
    color: string;
    bg: string;
    border: string;
    onPress: () => void;
}

export const WarningCards = ({ data }: WarningCardsProps) => {
    const navigation = useNavigation<any>();
    const { isDark } = useTheme();

    const chips: ChipItem[] = [];

    // 1. QR Signup Requests pending approval
    if (data.qrRegisterCount > 0) {
        chips.push({
            count: data.qrRegisterCount,
            label: 'QR Requests',
            icon: 'qr-code-outline',
            color: '#0284C7',
            bg: isDark ? 'rgba(2,132,199,0.18)' : '#F0F9FF',
            border: isDark ? 'rgba(2,132,199,0.4)' : '#BAE6FD',
            onPress: () => navigation.navigate('Students', { filter: 'QRRegister', tab: 'Requests' }),
        });
    }

    // 2. Unallocated Students (No Room assigned)
    if (data.unallocatedCount > 0) {
        chips.push({
            count: data.unallocatedCount,
            label: 'No Room',
            icon: 'bed-outline',
            color: '#E11D48',
            bg: isDark ? 'rgba(225,29,72,0.18)' : '#FFF1F2',
            border: isDark ? 'rgba(225,29,72,0.4)' : '#FECDD3',
            onPress: () => navigation.navigate('Students', { filterUnallocated: true, tab: 'All' }),
        });
    }

    // 3. Admission Fee Due / Pending
    if (data.pendingAdmissionsCount > 0) {
        chips.push({
            count: data.pendingAdmissionsCount,
            label: 'Adm Fee Due',
            icon: 'cash-outline',
            color: '#D97706',
            bg: isDark ? 'rgba(217,119,6,0.18)' : '#FFFBEB',
            border: isDark ? 'rgba(217,119,6,0.4)' : '#FDE68A',
            onPress: () => navigation.navigate('Students', { filter: 'AdmissionPending', tab: 'All' }),
        });
    }

    // 4. Pre-Bookings
    if ((data.prebookingsCount || 0) > 0) {
        chips.push({
            count: data.prebookingsCount!,
            label: 'Pre-Bookings',
            icon: 'calendar-outline',
            color: '#7C3AED',
            bg: isDark ? 'rgba(124,58,237,0.18)' : '#F5F3FF',
            border: isDark ? 'rgba(124,58,237,0.4)' : '#DDD6FE',
            onPress: () => navigation.navigate('PreBooking'),
        });
    }

    // 5. Vacate Notices Scheduled
    if ((data.vacateCount || 0) > 0) {
        chips.push({
            count: data.vacateCount!,
            label: 'Vacate Notices',
            icon: 'exit-outline',
            color: '#DC2626',
            bg: isDark ? 'rgba(220,38,38,0.18)' : '#FEF2F2',
            border: isDark ? 'rgba(220,38,38,0.4)' : '#FECACA',
            onPress: () => navigation.navigate('Students', { filter: 'Vacating', tab: 'All' }),
        });
    }

    // 6. Active Short-Stay Guests
    if ((data.activeGuestsCount || 0) > 0) {
        chips.push({
            count: data.activeGuestsCount!,
            label: 'Active Guests',
            icon: 'people-outline',
            color: '#059669',
            bg: isDark ? 'rgba(5,150,105,0.18)' : '#ECFDF5',
            border: isDark ? 'rgba(5,150,105,0.4)' : '#A7F3D0',
            onPress: () => navigation.navigate('Guests'),
        });
    }

    // 7. Open Complaints
    if (data.openComplaintsCount > 0) {
        chips.push({
            count: data.openComplaintsCount,
            label: 'Complaints',
            icon: 'construct-outline',
            color: '#4F46E5',
            bg: isDark ? 'rgba(79,70,229,0.18)' : '#EEF2FF',
            border: isDark ? 'rgba(79,70,229,0.4)' : '#C7D2FE',
            onPress: () => navigation.navigate('ComplaintsManagement'),
        });
    }

    if (chips.length === 0) return null;

    return (
        <View style={s.wrapper}>
            <View style={s.headerRow}>
                <View style={[s.dot, { backgroundColor: '#EF4444' }]} />
                <Text style={[s.headerLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Action Required
                </Text>
            </View>
            <ScrollView
                horizontal
                nestedScrollEnabled={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.scrollContent}
            >
                {chips.map((chip, i) => (
                    <TouchableOpacity
                        key={i}
                        style={[s.chip, { backgroundColor: chip.bg, borderColor: chip.border }]}
                        onPress={chip.onPress}
                        activeOpacity={0.75}
                    >
                        <View style={[s.chipIcon, { backgroundColor: chip.color + '22' }]}>
                            <Ionicons name={chip.icon} size={13} color={chip.color} />
                        </View>
                        <Text style={[s.chipCount, { color: chip.color }]}>{chip.count}</Text>
                        <Text style={[s.chipLabel, { color: chip.color }]}>{chip.label}</Text>
                        <Ionicons name="chevron-forward" size={11} color={chip.color} style={{ opacity: 0.7 }} />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const s = StyleSheet.create({
    wrapper: {
        marginBottom: 4,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 8,
        paddingHorizontal: 2,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    headerLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    scrollContent: {
        gap: 8,
        paddingRight: 4,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 7,
        paddingHorizontal: 11,
        borderRadius: 20,
        borderWidth: 1,
    },
    chipIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chipCount: {
        fontSize: 13,
        fontWeight: '800',
    },
    chipLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
});
