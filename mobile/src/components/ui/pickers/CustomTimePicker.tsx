import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../contexts/ThemeContext';

export interface CustomTimePickerProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (date: Date) => void;
    initialDate?: Date;
}

const CLOCK_RADIUS = 120;
const NUMBER_RADIUS = 95;

export function CustomTimePicker({ visible, onClose, onConfirm, initialDate }: CustomTimePickerProps) {
    const { theme } = useTheme();
    const primary = theme?.primary || '#8B291A';
    const primarySoft = primary + '15';

    const [date, setDate] = useState(initialDate || new Date());
    
    // Derived state for the clock
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const isPM = hours >= 12;
    const displayHours = hours % 12 || 12;
    
    // We'll use a simple hour selector for now to mimic the design
    const [selecting, setSelecting] = useState<'hour' | 'minute'>('hour');

    const toggleAMPM = (pm: boolean) => {
        const newDate = new Date(date);
        if (pm && hours < 12) newDate.setHours(hours + 12);
        if (!pm && hours >= 12) newDate.setHours(hours - 12);
        setDate(newDate);
    };

    const handleClockPress = (val: number) => {
        const newDate = new Date(date);
        if (selecting === 'hour') {
            const h = val === 12 ? (isPM ? 12 : 0) : (isPM ? val + 12 : val);
            newDate.setHours(h);
            setDate(newDate);
            setSelecting('minute'); // Auto switch to minutes
        } else {
            newDate.setMinutes(val);
            setDate(newDate);
        }
    };

    const clockNumbers = selecting === 'hour' 
        ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
        : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    // Clock Hand Angle
    const angle = selecting === 'hour' 
        ? (displayHours / 12) * 360 
        : (minutes / 60) * 360;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={S.modalOverlay}>
                <View style={S.container}>
                    {/* Header */}
                    <View style={S.header}>
                        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                            <Ionicons name="arrow-back" size={24} color="#1E293B" />
                        </TouchableOpacity>
                        <Text style={S.headerTitle}>Select Time</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <View style={S.body}>
                        {/* AM / PM Toggle */}
                        <View style={S.amPmWrap}>
                            <TouchableOpacity 
                                style={[S.amPmBtn, !isPM && { backgroundColor: primary }]}
                                onPress={() => toggleAMPM(false)}
                            >
                                <Text style={[S.amPmText, !isPM && { color: '#FFF' }]}>AM</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[S.amPmBtn, isPM && { backgroundColor: primary }]}
                                onPress={() => toggleAMPM(true)}
                            >
                                <Text style={[S.amPmText, isPM && { color: '#FFF' }]}>PM</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Clock Face */}
                        <View style={S.clockContainer}>
                            <View style={[S.clockCircle, { backgroundColor: primarySoft }]}>
                                {/* Clock Center Dot */}
                                <View style={[S.clockCenter, { backgroundColor: primary }]} />
                                
                                {/* Clock Hand */}
                                <View style={[
                                    S.clockHand, 
                                    { backgroundColor: primary, transform: [{ rotate: `${angle}deg` }] }
                                ]}>
                                    <View style={[S.clockHandDot, { backgroundColor: primary }]} />
                                </View>

                                {/* Clock Numbers */}
                                {clockNumbers.map((num, i) => {
                                    const rad = (i * 30 - 90) * (Math.PI / 180);
                                    const x = CLOCK_RADIUS + NUMBER_RADIUS * Math.cos(rad) - 20; // 20 is half of number box
                                    const y = CLOCK_RADIUS + NUMBER_RADIUS * Math.sin(rad) - 20;
                                    const isSelected = selecting === 'hour' ? (num === displayHours || (num === 0 && displayHours === 12)) : num === minutes;

                                    return (
                                        <TouchableOpacity
                                            key={i}
                                            style={[S.numberBox, { left: x, top: y }, isSelected && { backgroundColor: primary }]}
                                            onPress={() => handleClockPress(num)}
                                        >
                                            <Text style={[S.numberText, isSelected && { color: '#FFF' }]}>
                                                {num}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Digital Readout */}
                        <View style={S.digitalWrap}>
                            <View style={S.digitalBox}>
                                <TouchableOpacity onPress={() => setSelecting('hour')}>
                                    <Text style={[S.digitalText, selecting === 'hour' && { color: primary }]}>
                                        {displayHours.toString().padStart(2, '0')}
                                    </Text>
                                </TouchableOpacity>
                                <Text style={S.digitalColon}>:</Text>
                                <TouchableOpacity onPress={() => setSelecting('minute')}>
                                    <Text style={[S.digitalText, selecting === 'minute' && { color: primary }]}>
                                        {minutes.toString().padStart(2, '0')}
                                    </Text>
                                </TouchableOpacity>
                                <View style={[S.digitalAmPm, { backgroundColor: primarySoft }]}>
                                    <Text style={[S.digitalAmPmText, { color: primary }]}>{isPM ? 'PM' : 'AM'}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={S.footer}>
                        <TouchableOpacity 
                            style={[S.confirmBtn, { backgroundColor: primary }]} 
                            onPress={() => {
                                onConfirm(date);
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
        paddingBottom: 20,
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
    body: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    amPmWrap: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 4,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    amPmBtn: {
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 12,
    },
    amPmText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#64748B',
    },
    clockContainer: {
        width: CLOCK_RADIUS * 2,
        height: CLOCK_RADIUS * 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    clockCircle: {
        width: CLOCK_RADIUS * 2,
        height: CLOCK_RADIUS * 2,
        borderRadius: CLOCK_RADIUS,
        position: 'relative',
    },
    clockCenter: {
        width: 10,
        height: 10,
        borderRadius: 5,
        position: 'absolute',
        top: CLOCK_RADIUS - 5,
        left: CLOCK_RADIUS - 5,
        zIndex: 10,
    },
    clockHand: {
        position: 'absolute',
        width: 2,
        height: NUMBER_RADIUS,
        left: CLOCK_RADIUS - 1,
        top: CLOCK_RADIUS - NUMBER_RADIUS,
        transformOrigin: 'bottom',
        zIndex: 5,
    },
    clockHandDot: {
        width: 34,
        height: 34,
        borderRadius: 17,
        position: 'absolute',
        top: -17,
        left: -16,
    },
    numberBox: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
    },
    numberText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
    },
    digitalWrap: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    digitalBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    digitalText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1E293B',
    },
    digitalColon: {
        fontSize: 24,
        fontWeight: '700',
        color: '#64748B',
        marginHorizontal: 8,
    },
    digitalAmPm: {
        marginLeft: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    digitalAmPmText: {
        fontSize: 14,
        fontWeight: '800',
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 20,
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
