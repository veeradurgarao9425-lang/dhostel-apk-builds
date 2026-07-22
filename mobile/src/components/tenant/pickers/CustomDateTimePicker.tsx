import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { CustomTimePicker } from './CustomTimePicker';

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface CustomDateTimePickerProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (date: Date) => void;
    initialDate?: Date;
    title?: string;
}

export function CustomDateTimePicker({ visible, onClose, onConfirm, initialDate, title = "Select Date & Time" }: CustomDateTimePickerProps) {
    
    const primary = '#8B4513';
    const primarySoft = primary + '15';

    const [currentDate, setCurrentDate] = useState(initialDate || new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());
    
    // Time picker sub-modal
    const [showTimePicker, setShowTimePicker] = useState(false);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const changeMonth = (offset: number) => {
        setCurrentDate(new Date(year, month + offset, 1));
    };

    const handleDayPress = (day: number) => {
        const newDate = new Date(year, month, day);
        // preserve selected hours/minutes
        newDate.setHours(selectedDate.getHours());
        newDate.setMinutes(selectedDate.getMinutes());
        newDate.setSeconds(0);
        newDate.setMilliseconds(0);
        setSelectedDate(newDate);
    };

    const handleTimeConfirm = (timeObj: Date) => {
        const newDate = new Date(selectedDate);
        newDate.setHours(timeObj.getHours());
        newDate.setMinutes(timeObj.getMinutes());
        setSelectedDate(newDate);
    };

    const formatTime = (d: Date) => {
        const h = d.getHours();
        const m = d.getMinutes();
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
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
        const d = new Date(year, month, day);
        return (
            selectedDate.getFullYear() === d.getFullYear() &&
            selectedDate.getMonth() === d.getMonth() &&
            selectedDate.getDate() === d.getDate()
        );
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

                        <View style={S.divider} />

                        {/* Time Row */}
                        <View style={S.timeRow}>
                            <Text style={S.timeLabel}>Time</Text>
                            <TouchableOpacity 
                                style={[S.timePill, { borderColor: primarySoft, backgroundColor: primarySoft }]}
                                onPress={() => setShowTimePicker(true)}
                            >
                                <Ionicons name="time-outline" size={16} color={primary} style={{ marginRight: 6 }} />
                                <Text style={[S.timePillText, { color: primary }]}>{formatTime(selectedDate)}</Text>
                                <Ionicons name="chevron-forward" size={16} color={primary} style={{ marginLeft: 6 }} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={{ height: 20 }} />
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

            {/* Sub-modal for time selection */}
            {showTimePicker && (
                <CustomTimePicker 
                    visible={showTimePicker}
                    initialDate={selectedDate}
                    onClose={() => setShowTimePicker(false)}
                    onConfirm={(t) => {
                        handleTimeConfirm(t);
                        setShowTimePicker(false);
                    }}
                />
            )}
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
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 20,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    timeLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    timePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    timePillText: {
        fontSize: 15,
        fontWeight: '700',
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
