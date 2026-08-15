import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';


const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface CustomDatePickerProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (date: Date) => void;
    initialDate?: Date;
    title?: string;
}

export function CustomDatePicker({ visible, onClose, onConfirm, initialDate, title = "Select Date" }: CustomDatePickerProps) {
    
    const primary = '#8B4513';
    const primarySoft = primary + '15';

    const [currentDate, setCurrentDate] = useState(initialDate || new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const changeMonth = (offset: number) => {
        setCurrentDate(new Date(year, month + offset, 1));
    };

    const handleDayPress = (day: number) => {
        const selected = new Date(year, month, day);
        selected.setHours(0, 0, 0, 0);
        setSelectedDate(selected);
    };

    const formatDisplay = (d: Date | null) => {
        if (!d) return '--';
        return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    };

    const calendarGrid = useMemo(() => {
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const grid: (number | null)[] = Array(firstDay).fill(null);
        for (let i = 1; i <= daysInMonth; i++) grid.push(i);
        while (grid.length % 7 !== 0) grid.push(null);
        return grid;
    }, [year, month]);

    const isSelected = (day: number) => {
        if (!day) return false;
        const d = new Date(year, month, day).getTime();
        return selectedDate?.getTime() === d;
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={S.modalOverlay}>
                <View style={S.container}>
                    {/* Header */}
                    <View style={S.header}>
                        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                            <Ionicons name="arrow-back" size={24} color="#1E293B" />
                        </TouchableOpacity>
                        <Text style={S.headerTitle}>{title}</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <ScrollView style={{ paddingHorizontal: 20 }}>
                        {/* Month Selector */}
                        <View style={S.monthSelector}>
                            <TouchableOpacity onPress={() => changeMonth(-1)}>
                                <Ionicons name="chevron-back" size={24} color="#64748B" />
                            </TouchableOpacity>
                            <Text style={S.monthText}>{MONTHS[month]} {year}</Text>
                            <TouchableOpacity onPress={() => changeMonth(1)}>
                                <Ionicons name="chevron-forward" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {/* Days Header */}
                        <View style={S.daysHeader}>
                            {DAYS.map((d, i) => (
                                <Text key={i} style={S.dayHeaderText}>{d}</Text>
                            ))}
                        </View>

                        {/* Calendar Grid */}
                        <View style={S.grid}>
                            {calendarGrid.map((day, i) => {
                                const sel = day ? isSelected(day) : false;
                                
                                return (
                                    <View key={i} style={S.cellWrap}>
                                        {day ? (
                                            <TouchableOpacity 
                                                style={[S.dayCell, sel && { backgroundColor: primary }]}
                                                onPress={() => handleDayPress(day)}
                                            >
                                                <Text style={[S.dayText, sel && { color: '#FFF', fontWeight: '800' }]}>{day}</Text>
                                            </TouchableOpacity>
                                        ) : <View style={S.dayCell} />}
                                    </View>
                                );
                            })}
                        </View>

                        {/* Selected Display */}
                        <View style={S.selectedBox}>
                            <View style={S.selectedRow}>
                                <View style={S.iconBox}>
                                    <Ionicons name="calendar-outline" size={16} color={primary} />
                                </View>
                                <Text style={S.selectedLabel}>Selected Date</Text>
                                <Text style={S.selectedDate}>{formatDisplay(selectedDate)}</Text>
                            </View>
                        </View>

                    </ScrollView>

                    <View style={S.footer}>
                        <TouchableOpacity 
                            style={[S.confirmBtn, { backgroundColor: primary }]} 
                            onPress={() => {
                                onConfirm(selectedDate);
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
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        height: '90%',
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
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    monthText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
    },
    daysHeader: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    dayHeaderText: {
        flex: 1,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '700',
        color: '#94A3B8',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    cellWrap: {
        width: '14.28%',
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 4,
    },
    dayCell: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 18,
    },
    dayText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1E293B',
    },
    selectedBox: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        padding: 16,
        marginTop: 20,
        marginBottom: 20,
    },
    selectedRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        marginRight: 12,
    },
    selectedLabel: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '600',
        flex: 1,
    },
    selectedDate: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
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
