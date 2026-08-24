import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../../contexts/ThemeContext';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface CustomMonthYearPickerProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (date: Date) => void;
    initialDate?: Date;
}

export function CustomMonthYearPicker({ visible, onClose, onConfirm, initialDate }: CustomMonthYearPickerProps) {
    const { theme, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const primary = theme?.primary || '#6366F1';

    const [selectedYear, setSelectedYear] = useState(initialDate ? initialDate.getFullYear() : new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(initialDate ? initialDate.getMonth() : new Date().getMonth());
    
    // Pagination for years (blocks of 9)
    const [yearPage, setYearPage] = useState(0);

    const baseYear = (initialDate ? initialDate.getFullYear() : new Date().getFullYear()) - 4 + (yearPage * 9);
    const years = Array.from({ length: 9 }, (_, i) => baseYear + i);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <View style={S.modalOverlay}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <View style={[S.container, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                    {/* Header */}
                    <View style={[S.header, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
                        <TouchableOpacity onPress={onClose} style={{ padding: 4 }} activeOpacity={0.7}>
                            <Ionicons name="arrow-back" size={24} color={isDark ? '#F8FAFC' : '#1E293B'} />
                        </TouchableOpacity>
                        <Text style={[S.headerTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>Select Month & Year</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
                        
                        {/* Select Year */}
                        <View style={S.sectionHeader}>
                            <TouchableOpacity onPress={() => setYearPage(p => p - 1)} style={[S.navArrow, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} activeOpacity={0.7}>
                                <Ionicons name="chevron-back" size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                            </TouchableOpacity>
                            <Text style={[S.sectionTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>Select Year ({selectedYear})</Text>
                            <TouchableOpacity onPress={() => setYearPage(p => p + 1)} style={[S.navArrow, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} activeOpacity={0.7}>
                                <Ionicons name="chevron-forward" size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                            </TouchableOpacity>
                        </View>
                        <View style={S.grid}>
                            {years.map(y => {
                                const sel = y === selectedYear;
                                return (
                                    <View key={y} style={S.cellWrap}>
                                        <TouchableOpacity 
                                            style={[
                                                S.cellBtn, 
                                                { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' },
                                                sel && { backgroundColor: primary, borderColor: primary }
                                            ]}
                                            onPress={() => setSelectedYear(y)}
                                            activeOpacity={0.75}
                                        >
                                            <Text style={[S.cellText, { color: isDark ? '#F8FAFC' : '#475569' }, sel && { color: '#FFF', fontWeight: '800' }]}>{y}</Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>

                        <View style={[S.divider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />

                        {/* Select Month */}
                        <Text style={[S.sectionTitle, { color: isDark ? '#F8FAFC' : '#1E293B', marginBottom: 8 }]}>Select Month</Text>
                        <View style={S.grid}>
                            {MONTHS.map((m, i) => {
                                const sel = i === selectedMonth;
                                return (
                                    <View key={i} style={S.cellWrap}>
                                        <TouchableOpacity 
                                            style={[
                                                S.cellBtn, 
                                                { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' },
                                                sel && { backgroundColor: primary, borderColor: primary }
                                            ]}
                                            onPress={() => setSelectedMonth(i)}
                                            activeOpacity={0.75}
                                        >
                                            <Text style={[S.cellText, { color: isDark ? '#F8FAFC' : '#475569' }, sel && { color: '#FFF', fontWeight: '800' }]}>{m}</Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>

                    </ScrollView>

                    <View style={[
                        S.footer, 
                        { 
                            borderTopColor: isDark ? '#334155' : '#F1F5F9',
                            paddingBottom: Math.max(insets.bottom + 16, 28)
                        }
                    ]}>
                        <TouchableOpacity 
                            style={[S.confirmBtn, { backgroundColor: primary }]} 
                            onPress={() => {
                                const d = new Date(selectedYear, selectedMonth, 1);
                                onConfirm(d);
                                onClose();
                            }}
                            activeOpacity={0.85}
                        >
                            <Text style={S.confirmBtnText}>Confirm</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const S = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '80%',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 14,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 14,
        marginBottom: 10,
    },
    navArrow: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -5,
    },
    cellWrap: {
        width: '33.33%',
        padding: 5,
    },
    cellBtn: {
        backgroundColor: '#F8FAFC',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    cellText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 14,
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 14,
        borderTopWidth: 1,
        borderColor: '#F1F5F9',
    },
    confirmBtn: {
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    confirmBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    }
});

