import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../contexts/ThemeContext';

// Basic Date Logic
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface DateRange {
    start: Date | null;
    end: Date | null;
}

export interface CustomDateRangePickerProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (range: DateRange) => void;
    initialRange?: DateRange;
}

export function CustomDateRangePicker({ visible, onClose, onConfirm, initialRange }: CustomDateRangePickerProps) {
    const { theme } = useTheme();
    const primary = theme?.primary || '#8B291A';
    const primarySoft = primary + '25'; // slightly darker for better visibility

    const [currentDate, setCurrentDate] = useState(initialRange?.start || new Date());
    const [range, setRange] = useState<DateRange>({
        start: initialRange?.start || null,
        end: initialRange?.end || null,
    });

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const changeMonth = (offset: number) => {
        setCurrentDate(new Date(year, month + offset, 1));
    };

    const handleDayPress = (day: number) => {
        const selected = new Date(year, month, day);
        selected.setHours(0, 0, 0, 0);

        if (!range.start || (range.start && range.end)) {
            // Start new range
            setRange({ start: selected, end: null });
        } else if (range.start && !range.end) {
            // Select end (swap if before start)
            if (selected < range.start) {
                setRange({ start: selected, end: range.start });
            } else {
                setRange({ ...range, end: selected });
            }
        }
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
        return (range.start?.getTime() === d) || (range.end?.getTime() === d);
    };

    const isInRange = (day: number) => {
        if (!day || !range.start || !range.end) return false;
        const d = new Date(year, month, day).getTime();
        return d > range.start.getTime() && d < range.end.getTime();
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
                        <Text style={S.headerTitle}>Select Date Range</Text>
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
                                const inR = day ? isInRange(day) : false;
                                
                                const isStart = day ? (range.start?.getTime() === new Date(year, month, day).getTime()) : false;
                                const isEnd = day ? (range.end?.getTime() === new Date(year, month, day).getTime()) : false;
                                
                                return (
                                    <View key={i} style={[
                                        S.cellWrap,
                                        inR && { backgroundColor: primarySoft },
                                        isStart && { borderTopLeftRadius: 22, borderBottomLeftRadius: 22, backgroundColor: range.end ? primarySoft : 'transparent', overflow: 'hidden' },
                                        isEnd && { borderTopRightRadius: 22, borderBottomRightRadius: 22, backgroundColor: primarySoft, overflow: 'hidden' }
                                    ]}>
                                        {day ? (
                                            <TouchableOpacity 
                                                style={[S.dayCell, sel && { backgroundColor: primary }]}
                                                onPress={() => handleDayPress(day)}
                                            >
                                                <Text style={[S.dayText, (sel || inR) && { color: sel ? '#FFF' : primary, fontWeight: '900' }]}>{day}</Text>
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
                                <Text style={S.selectedLabel}>Start Date</Text>
                                <Text style={S.selectedDate}>{formatDisplay(range.start)}</Text>
                            </View>
                            <View style={S.divider} />
                            <View style={S.selectedRow}>
                                <View style={S.iconBox}>
                                    <Ionicons name="calendar-outline" size={16} color={primary} />
                                </View>
                                <Text style={S.selectedLabel}>End Date</Text>
                                <Text style={S.selectedDate}>{formatDisplay(range.end)}</Text>
                            </View>
                        </View>

                    </ScrollView>

                    <View style={S.footer}>
                        <TouchableOpacity 
                            style={[S.confirmBtn, { backgroundColor: primary }]} 
                            onPress={() => onConfirm(range)}
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
    divider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 12,
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
