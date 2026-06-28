import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export interface FilterDuesProps {
    visible: boolean;
    onClose: () => void;
    onApply: (filters: any) => void;
}

export function FilterDuesModal({ visible, onClose, onApply }: FilterDuesProps) {
    const { theme, isDark } = useTheme();
    const primary = theme?.primary || '#8B291A';
    
    const [status, setStatus] = useState('All');
    const [datePreset, setDatePreset] = useState('All Time');
    const [room, setRoom] = useState('All');

    const handleApply = () => {
        onApply({ status, datePreset, room });
        onClose();
    };

    const handleReset = () => {
        setStatus('All');
        setDatePreset('All Time');
        setRoom('All');
    };

    const StatusPill = ({ label }: { label: string }) => {
        const active = status === label;
        return (
            <TouchableOpacity 
                style={[S.pill, active && { backgroundColor: primary, borderColor: primary }, isDark && !active && { borderColor: '#334155' }]} 
                onPress={() => setStatus(label)}
            >
                <Text style={[S.pillText, active && { color: '#FFF' }, isDark && !active && { color: '#CBD5E1' }]}>{label}</Text>
            </TouchableOpacity>
        );
    };

    const DatePill = ({ label }: { label: string }) => {
        const active = datePreset === label;
        return (
            <TouchableOpacity 
                style={[S.pill, active && { backgroundColor: primary, borderColor: primary }, isDark && !active && { borderColor: '#334155' }]} 
                onPress={() => setDatePreset(label)}
            >
                <Text style={[S.pillText, active && { color: '#FFF' }, isDark && !active && { color: '#CBD5E1' }]}>{label}</Text>
            </TouchableOpacity>
        );
    };
    
    const RoomPill = ({ label }: { label: string }) => {
        const active = room === label;
        return (
            <TouchableOpacity 
                style={[S.pill, active && { backgroundColor: primary, borderColor: primary }, isDark && !active && { borderColor: '#334155' }]} 
                onPress={() => setRoom(label)}
            >
                <Text style={[S.pillText, active && { color: '#FFF' }, isDark && !active && { color: '#CBD5E1' }]}>{label}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={S.modalOverlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                <View style={[S.modalContent, { backgroundColor: isDark ? '#1E293B' : '#FFF' }]}>
                    <View style={S.modalHeader}>
                        <Text style={[S.modalTitle, { color: theme.textPrimary }]}>Filter Dues</Text>
                        <TouchableOpacity onPress={onClose} style={S.closeBtn}>
                            <Ionicons name="close" size={24} color={theme.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={S.scrollContent} showsVerticalScrollIndicator={false}>
                        
                        <Text style={[S.sectionTitle, { color: theme.textSecondary }]}>Payment Status</Text>
                        <View style={S.pillContainer}>
                            <StatusPill label="All" />
                            <StatusPill label="Pending" />
                            <StatusPill label="Partial" />
                        </View>
                        <View style={[S.divider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />

                        <Text style={[S.sectionTitle, { color: theme.textSecondary }]}>Time Period</Text>
                        <View style={S.pillContainer}>
                            <DatePill label="All Time" />
                            <DatePill label="Last 3 Months" />
                            <DatePill label="This Month" />
                        </View>
                        <View style={[S.divider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />

                        <Text style={[S.sectionTitle, { color: theme.textSecondary }]}>Room Filter</Text>
                        <View style={S.pillContainer}>
                            <RoomPill label="All" />
                            <RoomPill label="Has Room" />
                            <RoomPill label="Unallocated" />
                        </View>

                    </ScrollView>

                    <View style={[S.modalFooter, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                        <TouchableOpacity style={[S.resetBtn, { borderColor: isDark ? '#475569' : '#E2E8F0' }]} onPress={handleReset}>
                            <Text style={[S.resetBtnTxt, { color: theme.textPrimary }]}>Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[S.applyBtn, { backgroundColor: primary }]} onPress={handleApply}>
                            <Text style={S.applyBtnTxt}>Apply Filters</Text>
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
    modalContent: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
    },
    closeBtn: {
        padding: 4,
        backgroundColor: 'rgba(148, 163, 184, 0.1)',
        borderRadius: 20,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 16,
    },
    pillContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    pill: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        backgroundColor: 'transparent',
    },
    pillText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    divider: {
        height: 1,
        marginVertical: 20,
    },
    modalFooter: {
        flexDirection: 'row',
        borderTopWidth: 1,
        paddingTop: 16,
        gap: 12,
    },
    resetBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
    },
    resetBtnTxt: {
        fontSize: 16,
        fontWeight: '700',
    },
    applyBtn: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    applyBtnTxt: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
