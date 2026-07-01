import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';


const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface CustomMonthYearPickerProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (date: Date) => void;
    initialDate?: Date;
}

export function CustomMonthYearPicker({ visible, onClose, onConfirm, initialDate }: CustomMonthYearPickerProps) {
    
    const primary = '#8B4513';

    const [selectedYear, setSelectedYear] = useState(initialDate ? initialDate.getFullYear() : new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(initialDate ? initialDate.getMonth() : new Date().getMonth());
    
    // Pagination for years (blocks of 9)
    const [yearPage, setYearPage] = useState(0);

    const baseYear = (initialDate ? initialDate.getFullYear() : new Date().getFullYear()) - 4 + (yearPage * 9);
    const years = Array.from({ length: 9 }, (_, i) => baseYear + i);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={S.modalOverlay}>
                <View style={S.container}>
                    {/* Header */}
                    <View style={S.header}>
                        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                            <Ionicons name="arrow-back" size={24} color="#1E293B" />
                        </TouchableOpacity>
                        <Text style={S.headerTitle}>Select Month & Year</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <ScrollView style={{ paddingHorizontal: 20 }}>
                        
                        {/* Select Year */}
                        <View style={S.sectionHeader}>
                            <TouchableOpacity onPress={() => setYearPage(p => p - 1)} style={{ padding: 4 }}>
                                <Ionicons name="chevron-back" size={20} color="#64748B" />
                            </TouchableOpacity>
                            <Text style={S.sectionTitle}>Select Year</Text>
                            <TouchableOpacity onPress={() => setYearPage(p => p + 1)} style={{ padding: 4 }}>
                                <Ionicons name="chevron-forward" size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        <View style={S.grid}>
                            {years.map(y => {
                                const sel = y === selectedYear;
                                return (
                                    <View key={y} style={S.cellWrap}>
                                        <TouchableOpacity 
                                            style={[S.cellBtn, sel && { backgroundColor: primary }]}
                                            onPress={() => setSelectedYear(y)}
                                        >
                                            <Text style={[S.cellText, sel && { color: '#FFF' }]}>{y}</Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>

                        <View style={S.divider} />

                        {/* Select Month */}
                        <Text style={S.sectionTitle}>Select Month</Text>
                        <View style={S.grid}>
                            {MONTHS.map((m, i) => {
                                const sel = i === selectedMonth;
                                return (
                                    <View key={i} style={S.cellWrap}>
                                        <TouchableOpacity 
                                            style={[S.cellBtn, sel && { backgroundColor: primary }]}
                                            onPress={() => setSelectedMonth(i)}
                                        >
                                            <Text style={[S.cellText, sel && { color: '#FFF' }]}>{m}</Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>

                    </ScrollView>

                    <View style={S.footer}>
                        <TouchableOpacity 
                            style={[S.confirmBtn, { backgroundColor: primary }]} 
                            onPress={() => {
                                const d = new Date(selectedYear, selectedMonth, 1);
                                onConfirm(d);
                                onClose();
                            }}
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
        backgroundColor: 'transparent',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        height: '80%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 16,
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
        marginTop: 16,
        marginBottom: 16,
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
        paddingVertical: 14,
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
        marginVertical: 20,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderColor: '#F1F5F9',
    },
    confirmBtn: {
        paddingVertical: 16,
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
