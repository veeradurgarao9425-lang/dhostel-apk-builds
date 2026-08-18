import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../../contexts/ThemeContext';
import { ModalSheet } from '../../FormComponents';

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
    onConfirm: (start: Date, end: Date) => void;
    initialStart?: Date;
    initialEnd?: Date;
    restrictMonth?: Date;
}

export function CustomDateRangePicker({ 
    visible, onClose, onConfirm, initialStart, initialEnd, restrictMonth 
}: CustomDateRangePickerProps) {
    const { theme, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const primary = theme?.primary || '#6366F1';
    const primarySoft = isDark ? `${primary}35` : `${primary}18`;

    const [currentDate, setCurrentDate] = useState(restrictMonth || initialStart || new Date());
    const [range, setRange] = useState<DateRange>({
        start: initialStart || null,
        end: initialEnd || null,
    });

    useEffect(() => {
        if (visible) {
            const start = restrictMonth || initialStart || new Date();
            setCurrentDate(start);
            
            if (restrictMonth) {
                const targetYear = restrictMonth.getFullYear();
                const targetMonth = restrictMonth.getMonth();
                
                const isWithinMonth = (d: Date | null) => {
                    if (!d) return false;
                    return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
                };
                
                setRange({
                    start: isWithinMonth(initialStart || null) ? (initialStart || null) : null,
                    end: isWithinMonth(initialEnd || null) ? (initialEnd || null) : null,
                });
            } else {
                setRange({
                    start: initialStart || null,
                    end: initialEnd || null,
                });
            }
        }
    }, [visible, restrictMonth, initialStart, initialEnd]);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const changeMonth = (offset: number) => {
        if (restrictMonth) return;
        setCurrentDate(new Date(year, month + offset, 1));
    };

    const handleDayPress = (day: number) => {
        const selected = new Date(year, month, day);
        selected.setHours(0, 0, 0, 0);

        if (!range.start || (range.start && range.end)) {
            setRange({ start: selected, end: null });
        } else if (range.start && !range.end) {
            if (selected < range.start) {
                setRange({ start: selected, end: range.start });
            } else {
                setRange({ ...range, end: selected });
            }
        }
    };

    const formatDisplay = (d: Date | null) => {
        if (!d) return 'Select Date';
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

    const hasCompleteRange = Boolean(range.start && range.end);

    return (
        <ModalSheet visible={visible} onClose={onClose} maxHeight="90%">
            <View style={S.containerWrapper}>
                {/* Header */}
                <View style={[S.header, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
                    <TouchableOpacity onPress={onClose} style={[S.navIconBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                        <Ionicons name="close" size={20} color={isDark ? '#F1F5F9' : '#1E293B'} />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={[S.headerTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>Select Date Range</Text>
                        <Text style={[S.headerSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                            {hasCompleteRange ? 'Range Selected' : range.start ? 'Select End Date' : 'Select Start Date'}
                        </Text>
                    </View>
                    <TouchableOpacity 
                        onPress={() => setRange({ start: null, end: null })} 
                        style={[S.navIconBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                    >
                        <Ionicons name="refresh" size={17} color={isDark ? '#94A3B8' : '#64748B'} />
                    </TouchableOpacity>
                </View>

                {/* Scrollable Body */}
                <ScrollView 
                    style={S.scrollBody} 
                    contentContainerStyle={{ paddingBottom: 16 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Month Navigator */}
                    <View style={S.monthSelector}>
                        {!restrictMonth ? (
                            <TouchableOpacity 
                                onPress={() => changeMonth(-1)} 
                                style={[S.monthNavBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                            >
                                <Ionicons name="chevron-back" size={20} color={isDark ? '#F1F5F9' : '#334155'} />
                            </TouchableOpacity>
                        ) : (
                            <View style={{ width: 36 }} />
                        )}
                        
                        <Text style={[S.monthText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                            {MONTHS[month]} {year}
                        </Text>

                        {!restrictMonth ? (
                            <TouchableOpacity 
                                onPress={() => changeMonth(1)}
                                style={[S.monthNavBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                            >
                                <Ionicons name="chevron-forward" size={20} color={isDark ? '#F1F5F9' : '#334155'} />
                            </TouchableOpacity>
                        ) : (
                            <View style={{ width: 36 }} />
                        )}
                    </View>

                    {/* Days Header */}
                    <View style={S.daysHeader}>
                        {DAYS.map((d, i) => (
                            <Text key={i} style={[S.dayHeaderText, { color: isDark ? '#94A3B8' : '#64748B' }]}>{d}</Text>
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
                                    isStart && { borderTopLeftRadius: 20, borderBottomLeftRadius: 20, backgroundColor: range.end ? primarySoft : 'transparent', overflow: 'hidden' },
                                    isEnd && { borderTopRightRadius: 20, borderBottomRightRadius: 20, backgroundColor: primarySoft, overflow: 'hidden' }
                                ]}>
                                    {day ? (
                                        <TouchableOpacity 
                                            style={[
                                                S.dayCell, 
                                                sel && { backgroundColor: primary },
                                            ]}
                                            onPress={() => handleDayPress(day)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[
                                                S.dayText, 
                                                { color: isDark ? '#F8FAFC' : '#1E293B' },
                                                (sel || inR) && { color: sel ? '#FFF' : primary, fontWeight: '900' }
                                            ]}>
                                                {day}
                                            </Text>
                                        </TouchableOpacity>
                                    ) : <View style={S.dayCell} />}
                                </View>
                            );
                        })}
                    </View>

                    {/* Selected Range Display */}
                    <View style={[S.selectedBox, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <View style={S.selectedRow}>
                            <View style={[S.iconBox, { backgroundColor: isDark ? '#1E293B' : '#EEF2FF' }]}>
                                <Ionicons name="calendar-outline" size={15} color={primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[S.selectedLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Start Date</Text>
                                <Text style={[S.selectedDate, { color: range.start ? (isDark ? '#F8FAFC' : '#0F172A') : '#94A3B8' }]}>
                                    {formatDisplay(range.start)}
                                </Text>
                            </View>
                        </View>

                        <View style={[S.divider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />

                        <View style={S.selectedRow}>
                            <View style={[S.iconBox, { backgroundColor: isDark ? '#1E293B' : '#EEF2FF' }]}>
                                <Ionicons name="calendar" size={15} color={primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[S.selectedLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>End Date</Text>
                                <Text style={[S.selectedDate, { color: range.end ? (isDark ? '#F8FAFC' : '#0F172A') : '#94A3B8' }]}>
                                    {formatDisplay(range.end)}
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>

                {/* Sticky Confirm Footer Button */}
                <View style={[
                    S.footer, 
                    { 
                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF', 
                        borderTopColor: isDark ? '#334155' : '#F1F5F9',
                        paddingBottom: Math.max(insets.bottom, 16),
                    }
                ]}>
                    <TouchableOpacity 
                        style={[
                            S.confirmBtn, 
                            { 
                                backgroundColor: hasCompleteRange ? primary : (isDark ? '#334155' : '#CBD5E1'),
                                opacity: hasCompleteRange ? 1 : 0.75,
                            }
                        ]} 
                        disabled={!hasCompleteRange}
                        onPress={() => { 
                            if (range.start && range.end) {
                                onConfirm(range.start, range.end);
                                onClose();
                            }
                        }}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="checkmark-circle" size={18} color="#FFF" style={{ marginRight: 6 }} />
                        <Text style={S.confirmBtnText}>
                            {hasCompleteRange ? 'Confirm & Apply Date Range' : 'Select Start & End Date'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ModalSheet>
    );
}

const S = StyleSheet.create({
    containerWrapper: {
        height: 560,
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingTop: 8,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    navIconBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '800',
    },
    headerSub: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 1,
    },
    scrollBody: {
        flex: 1,
        paddingHorizontal: 18,
    },
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    monthNavBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthText: {
        fontSize: 16,
        fontWeight: '800',
    },
    daysHeader: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    dayHeaderText: {
        flex: 1,
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: '700',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    cellWrap: {
        width: '14.28%',
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 2,
    },
    dayCell: {
        width: 34,
        height: 34,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 17,
    },
    dayText: {
        fontSize: 14,
        fontWeight: '600',
    },
    selectedBox: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
        marginTop: 14,
    },
    selectedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconBox: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedLabel: {
        fontSize: 10.5,
        fontWeight: '600',
    },
    selectedDate: {
        fontSize: 13,
        fontWeight: '700',
        marginTop: 1,
    },
    divider: {
        height: 1,
        marginVertical: 8,
    },
    footer: {
        paddingHorizontal: 18,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    confirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    confirmBtnText: {
        color: '#FFF',
        fontSize: 14.5,
        fontWeight: '800',
    },
});

export default CustomDateRangePicker;
