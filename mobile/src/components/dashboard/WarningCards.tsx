import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';

interface WarningCardsProps {
    data: {
        unallocatedCount: number;
        qrRegisterCount: number;
        openComplaintsCount: number;
    };
}

export const WarningCards = ({ data }: WarningCardsProps) => {
    const navigation = useNavigation<any>();
    const { isDark } = useTheme();

    return (
        <>
            {/* Unallocated Tenants warning card */}
            {data.unallocatedCount > 0 && (
                <TouchableOpacity
                    style={[
                        s.card,
                        {
                            backgroundColor: isDark ? '#3B1A1A' : '#FEF2F2',
                            borderColor: '#FCA5A5',
                        }
                    ]}
                    onPress={() => navigation.navigate('Students', { filterUnallocated: true })}
                    activeOpacity={0.8}
                >
                    <View style={s.cardBody}>
                        <View style={[s.iconBox, { backgroundColor: '#FEE2E2' }]}>
                            <Ionicons name="alert-circle" size={20} color="#DC2626" />
                        </View>
                        <View style={s.textWrap}>
                            <Text style={[s.title, { color: isDark ? '#FECACA' : '#991B1B' }]}>
                                {data.unallocatedCount} {data.unallocatedCount === 1 ? 'Tenant needs room allocation' : 'Tenants need room allocation'}
                            </Text>
                            <Text style={[s.subText, { color: isDark ? '#FCA5A5' : '#EF4444' }]}>
                                Tap to allocate rooms
                            </Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#DC2626" />
                </TouchableOpacity>
            )}

            {/* QR Signups warning card */}
            {data.qrRegisterCount > 0 && (
                <TouchableOpacity
                    style={[
                        s.card,
                        {
                            backgroundColor: isDark ? '#1A3038' : '#F0F9FF',
                            borderColor: '#BAE6FD',
                        }
                    ]}
                    onPress={() => navigation.navigate('Students', { filter: 'QRRegister' })}
                    activeOpacity={0.8}
                >
                    <View style={s.cardBody}>
                        <View style={[s.iconBox, { backgroundColor: '#E0F2FE' }]}>
                            <Ionicons name="person-add" size={20} color="#0284C7" />
                        </View>
                        <View style={s.textWrap}>
                            <Text style={[s.title, { color: isDark ? '#E0F2FE' : '#0369A1' }]}>
                                {data.qrRegisterCount} {data.qrRegisterCount === 1 ? 'New Registration Awaiting Approval' : 'New Registrations Awaiting Approval'}
                            </Text>
                            <Text style={[s.subText, { color: isDark ? '#BAE6FD' : '#0284C7' }]}>
                                Tap to review and approve signups
                            </Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#0284C7" />
                </TouchableOpacity>
            )}

            {/* Open Complaints warning card */}
            {data.openComplaintsCount > 0 && (
                <TouchableOpacity
                    style={[
                        s.card,
                        {
                            backgroundColor: isDark ? '#2D1A0E' : '#FFF7ED',
                            borderColor: '#FED7AA',
                        }
                    ]}
                    onPress={() => navigation.navigate('ComplaintsManagement')}
                    activeOpacity={0.8}
                >
                    <View style={s.cardBody}>
                        <View style={[s.iconBox, { backgroundColor: '#FEF3C7' }]}>
                            <Ionicons name="construct" size={20} color="#D97706" />
                        </View>
                        <View style={s.textWrap}>
                            <Text style={[s.title, { color: isDark ? '#FEF3C7' : '#92400E' }]}>
                                {data.openComplaintsCount} {data.openComplaintsCount === 1 ? 'Open Complaint' : 'Open Complaints'} from Tenants
                            </Text>
                            <Text style={[s.subText, { color: isDark ? '#FCD34D' : '#D97706' }]}>
                                Tap to view and resolve
                            </Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#D97706" />
                </TouchableOpacity>
            )}
        </>
    );
};

const s = StyleSheet.create({
    card: {
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        marginBottom: 16,
        borderRadius: 16,
    },
    cardBody: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textWrap: {
        flex: 1,
    },
    title: {
        fontWeight: '800',
        fontSize: 14,
    },
    subText: {
        fontSize: 11,
        marginTop: 2,
    },
});
