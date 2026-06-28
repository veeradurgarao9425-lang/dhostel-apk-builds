import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { CustomDateRangePicker, DateRange } from './ui/pickers/CustomDateRangePicker';
import { CustomDatePicker } from './ui/pickers/CustomDatePicker';
import { CustomMonthYearPicker } from './ui/pickers/CustomMonthYearPicker';
import { CustomTimePicker } from './ui/pickers/CustomTimePicker';
import { CustomDateTimePicker } from './ui/pickers/CustomDateTimePicker';
import { SelectionModal } from './ui/SelectionModal';
import { SearchUI } from './ui/SearchScreen';
import { NotificationsScreen } from './ui/NotificationsScreen';
import { useNetwork } from './ui/NetworkManager';
import { SkeletonCard, SkeletonLoader } from './ui/SkeletonLoader';
import { EmptyState } from './ui/EmptyState';
import { ActionSheet } from './ui/ActionSheet';
import { DangerModal } from './ui/DangerModal';
import { StatCard } from './ui/StatCard';
import Toast from 'react-native-toast-message';

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
    const [dateRange, setDateRange] = useState<DateRange | null>(null);
    const [showRangePicker, setShowRangePicker] = useState(false);
    
    // Demo states
    const [showSingleDate, setShowSingleDate] = useState(false);
    const [showMonthYear, setShowMonthYear] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showDateTimePicker, setShowDateTimePicker] = useState(false);
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [showSearchUI, setShowSearchUI] = useState(false);
    const [showNotificationsUI, setShowNotificationsUI] = useState(false);
    
    // States for Premium Components Demo
    const [showActionSheet, setShowActionSheet] = useState(false);
    const [showDangerModal, setShowDangerModal] = useState(false);
    const [showEmptyState, setShowEmptyState] = useState(false);
    
    // We can extract simulateBanner and simulateScreen to test network changes
    const { simulateBanner, simulateScreen } = useNetwork();
    
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');

    const handleApply = () => {
        onApply({ status, datePreset, dateRange, minAmount, maxAmount });
        onClose();
    };

    const handleReset = () => {
        setStatus('All');
        setDatePreset('All Time');
        setDateRange(null);
        setMinAmount('');
        setMaxAmount('');
    };

    const StatusPill = ({ label }: { label: string }) => {
        const active = status === label;
        return (
            <TouchableOpacity 
                style={[S.pill, active && { backgroundColor: primary, borderColor: primary }]} 
                onPress={() => setStatus(label)}
            >
                <Text style={[S.pillText, active && { color: '#FFF' }]}>{label}</Text>
            </TouchableOpacity>
        );
    };

    const DatePill = ({ label }: { label: string }) => {
        const active = datePreset === label;
        return (
            <TouchableOpacity 
                style={[S.pill, active && { backgroundColor: primary, borderColor: primary }]} 
                onPress={() => {
                    setDatePreset(label);
                    setDateRange(null);
                }}
            >
                <Text style={[S.pillText, active && { color: '#FFF' }]}>{label}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <>
            <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
                <View style={S.modalOverlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                    
                    <View style={S.container}>
                        <View style={S.dragHandle} />
                        
                        {/* Header */}
                        <View style={S.header}>
                            <Text style={S.headerTitle}>Filter Dues</Text>
                            <View style={S.headerRight}>
                                <TouchableOpacity onPress={handleReset}>
                                    <Text style={[S.clearText, { color: primary }]}>Clear All</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={onClose} style={S.closeBtn}>
                                    <Ionicons name="close" size={24} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={S.scrollBody}>
                            <View style={{ marginTop: 20, padding: 16, backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#334155' : '#E2E8F0' }}>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: primary, marginBottom: 12 }}>Premium UI Demos</Text>
                                
                                <View style={S.demoRow}>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => setShowActionSheet(true)}>
                                        <Ionicons name="ellipsis-vertical" size={16} color={primary} />
                                        <Text style={[S.demoBtnText, { color: primary }]}>Action Sheet</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => setShowDangerModal(true)}>
                                        <Ionicons name="warning" size={16} color={primary} />
                                        <Text style={[S.demoBtnText, { color: primary }]}>Danger Modal</Text>
                                    </TouchableOpacity>
                                </View>
                                
                                <View style={S.demoRow}>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => setShowEmptyState(!showEmptyState)}>
                                        <Ionicons name="document-outline" size={16} color={primary} />
                                        <Text style={[S.demoBtnText, { color: primary }]}>Toggle Empty State</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Stat Cards Demo */}
                                <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? '#94A3B8' : '#64748B', marginTop: 16, marginBottom: 8 }}>Stat Cards Demo</Text>
                                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                                    <StatCard title="Total Dues" value="₹45,200" icon="wallet" trend={{ value: '+12%', isPositive: true }} />
                                    <StatCard title="Occupied" value="45/50" icon="bed" trend={{ value: '-2%', isPositive: false }} iconColor="#3B82F6" />
                                </View>

                                {/* Skeleton Loaders Demo */}
                                <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? '#94A3B8' : '#64748B', marginBottom: 8 }}>Skeleton Loaders Demo</Text>
                                <SkeletonCard />
                                
                                {showEmptyState && (
                                    <View style={{ height: 350, backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderRadius: 16, overflow: 'hidden', marginTop: 12 }}>
                                        <EmptyState 
                                            icon="receipt-outline"
                                            title="No Pending Dues"
                                            subtitle="Awesome! All students have cleared their dues for this month."
                                            actionLabel="Send Receipts"
                                            onAction={() => Toast.show({ type: 'success', text1: 'Receipts Sent!' })}
                                        />
                                    </View>
                                )}
                            </View>

                            {/* Status Section */}
                            <Text style={S.sectionTitle}>Status</Text>
                            <View style={S.pillRow}>
                                <StatusPill label="All" />
                                <StatusPill label="Unpaid" />
                                <StatusPill label="Partly Paid" />
                                <StatusPill label="Paid" />
                            </View>

                            {/* Due Date Section */}
                            <Text style={S.sectionTitle}>Due Date</Text>
                            <View style={S.pillRow}>
                                <DatePill label="All Time" />
                                <DatePill label="This Month" />
                                <DatePill label="Last 3 Months" />
                            </View>
                            
                            <TouchableOpacity 
                                style={S.customRangeBox} 
                                onPress={() => setShowRangePicker(true)}
                            >
                                <Text style={S.customRangeText}>
                                    {dateRange?.start ? `${dateRange.start.toLocaleDateString()} - ${dateRange.end ? dateRange.end.toLocaleDateString() : ''}` : 'Custom Range'}
                                </Text>
                                <Ionicons name="calendar-outline" size={18} color="#94A3B8" />
                            </TouchableOpacity>

                            {/* Demo Pickers Section (For User Verification) */}
                            <View style={{ marginTop: 20, padding: 16, backgroundColor: '#FEF2F2', borderRadius: 16, borderWidth: 1, borderColor: '#FECACA' }}>
                                <Text style={[S.sectionTitle, { marginTop: 0, color: primary }]}>Demo Other Pickers</Text>
                                <Text style={{ fontSize: 13, color: '#991B1B', marginBottom: 12 }}>
                                    Tap these to view the other requested picker designs!
                                </Text>
                                <View style={{ gap: 8 }}>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => setShowSingleDate(true)}>
                                        <Ionicons name="calendar" size={16} color={primary} />
                                        <Text style={[S.demoBtnText, { color: primary }]}>Show Single Date Picker</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => setShowMonthYear(true)}>
                                        <Ionicons name="calendar" size={16} color={primary} />
                                        <Text style={[S.demoBtnText, { color: primary }]}>Show Month & Year Picker</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => setShowTimePicker(true)}>
                                        <Ionicons name="time" size={16} color={primary} />
                                        <Text style={[S.demoBtnText, { color: primary }]}>Show Time Picker</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => setShowDateTimePicker(true)}>
                                        <Ionicons name="calendar" size={16} color={primary} />
                                        <Text style={[S.demoBtnText, { color: primary }]}>Show Date & Time Picker</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => setShowSelectionModal(true)}>
                                        <Ionicons name="list" size={16} color={primary} />
                                        <Text style={[S.demoBtnText, { color: primary }]}>Demo Room Selection</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => setShowSearchUI(true)}>
                                        <Ionicons name="search" size={16} color={primary} />
                                        <Text style={[S.demoBtnText, { color: primary }]}>Demo Search UI</Text>
                                    </TouchableOpacity>
                                </View>
                                
                                <View style={S.demoRow}>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => setShowNotificationsUI(true)}>
                                        <Ionicons name="notifications" size={16} color={primary} />
                                        <Text style={[S.demoBtnText, { color: primary }]}>Demo Notifications UI</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => simulateBanner('syncing')}>
                                        <Ionicons name="wifi" size={16} color={primary} />
                                        <Text style={[S.demoBtnText, { color: primary }]}>Banner: Syncing</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={S.demoRow}>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => simulateScreen('OFFLINE')}>
                                        <Ionicons name="cloud-offline" size={16} color={primary} />
                                        <Text style={[S.demoBtnText, { color: primary }]}>Screen: Offline</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => simulateScreen('RECONNECTING')}>
                                        <Ionicons name="sync" size={16} color={primary} />
                                        <Text style={[S.demoBtnText, { color: primary }]}>Screen: Reconnecting</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={S.demoRow}>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => simulateScreen('POOR_CONNECTION')}>
                                        <Ionicons name="wifi-outline" size={16} color={primary} />
                                        <Text style={[S.demoBtnText, { color: primary }]}>Screen: Poor Conn</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => simulateScreen('SLOW_NETWORK')}>
                                        <Ionicons name="speedometer-outline" size={16} color={primary} />
                                        <Text style={[S.demoBtnText, { color: primary }]}>Screen: Slow Net</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={S.demoRow}>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => simulateScreen('SYNCING')}>
                                        <Ionicons name="sync-circle-outline" size={16} color={primary} />
                                        <Text style={[S.demoBtnText, { color: primary }]}>Screen: Sync Data</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => simulateScreen('MAINTENANCE')}>
                                        <Ionicons name="settings-outline" size={16} color={primary} />
                                        <Text style={[S.demoBtnText, { color: primary }]}>Screen: Maintenance</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={{ marginTop: 20, padding: 16, backgroundColor: '#F0F9FF', borderRadius: 16, borderWidth: 1, borderColor: '#BAE6FD' }}>
                                <Text style={[S.sectionTitle, { marginTop: 0, color: '#0369A1' }]}>Demo All Toasts</Text>
                                <View style={{ gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => Toast.show({ type: 'success', text1: 'Success!', text2: 'Your complaint has been submitted.' })}>
                                        <Text style={S.demoBtnText}>Success</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => Toast.show({ type: 'info', text1: 'Information', text2: 'New notice has been added.' })}>
                                        <Text style={S.demoBtnText}>Info</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => Toast.show({ type: 'warning', text1: 'Warning', text2: 'Please fill all the required fields.' })}>
                                        <Text style={S.demoBtnText}>Warning</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => Toast.show({ type: 'error', text1: 'Error', text2: 'Something went wrong. Please try again.' })}>
                                        <Text style={S.demoBtnText}>Error</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => Toast.show({ type: 'payment', text1: 'Payment Successful', text2: 'Your payment of ₹3,650 was successful.' })}>
                                        <Text style={S.demoBtnText}>Payment</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => Toast.show({ type: 'online', text1: "You're Online", text2: 'Connected to the portal successfully.' })}>
                                        <Text style={S.demoBtnText}>Online</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => Toast.show({ type: 'offline', text1: "You're Offline", text2: 'Some features may not be available.' })}>
                                        <Text style={S.demoBtnText}>Offline</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => Toast.show({ type: 'expense', text1: 'Expense Added!', text2: 'Breakfast added for ₹ 120.', props: { onAction: () => console.log('undo') } })}>
                                        <Text style={S.demoBtnText}>Expense</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => Toast.show({ type: 'notice', text1: 'New Notice', text2: 'Room cleaning schedule updated.', props: { onAction: () => console.log('view') } })}>
                                        <Text style={S.demoBtnText}>Notice</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => Toast.show({ type: 'lowBalance', text1: 'Low Balance', text2: 'Your wallet balance is low.', props: { onAction: () => console.log('add money') } })}>
                                        <Text style={S.demoBtnText}>Low Balance</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => Toast.show({ type: 'saving', text1: 'Saving Changes...', text2: 'Please wait a moment.' })}>
                                        <Text style={S.demoBtnText}>Saving</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={S.demoBtn} onPress={() => Toast.show({ type: 'downloading', text1: 'Downloading Invoice...', text2: '32%', props: { progress: 32 } })}>
                                        <Text style={S.demoBtnText}>Downloading</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            
                            <View style={{ height: 40 }} />
                        </ScrollView>

                        {/* Footer */}
                        <View style={S.footer}>
                            <TouchableOpacity style={S.resetBtn} onPress={handleReset}>
                                <Text style={[S.resetBtnText, { color: primary }]}>Reset</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[S.applyBtn, { backgroundColor: primary }]} onPress={handleApply}>
                                <Text style={S.applyBtnText}>Apply Filters</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Custom Range Picker */}
            {showRangePicker && (
                <CustomDateRangePicker 
                    visible={showRangePicker}
                    onClose={() => setShowRangePicker(false)}
                    initialRange={dateRange || undefined}
                    onConfirm={(range) => {
                        setDateRange(range);
                        setDatePreset('Custom');
                        setShowRangePicker(false);
                    }}
                />
            )}

            {/* Demo Pickers */}
            <CustomDatePicker 
                visible={showSingleDate} 
                onClose={() => setShowSingleDate(false)} 
                onConfirm={() => setShowSingleDate(false)} 
            />
            <CustomMonthYearPicker 
                visible={showMonthYear} 
                onClose={() => setShowMonthYear(false)} 
                onConfirm={() => setShowMonthYear(false)} 
            />
            <CustomTimePicker 
                visible={showTimePicker} 
                onClose={() => setShowTimePicker(false)} 
                onConfirm={() => setShowTimePicker(false)} 
            />
            <CustomDateTimePicker 
                visible={showDateTimePicker}
                onClose={() => setShowDateTimePicker(false)}
                onSelect={(d) => { console.log(d); setShowDateTimePicker(false); }}
                initialDate={new Date()}
            />

            <SelectionModal 
                visible={showSelectionModal}
                title="Select Room"
                onClose={() => setShowSelectionModal(false)}
                onConfirm={(item) => { 
                    Toast.show({ type: 'success', text1: 'Room Selected', text2: `You selected ${item.label}` });
                    setShowSelectionModal(false); 
                }}
                items={[
                    { id: '101', label: 'Room 101', subLabel: 'Occupied' },
                    { id: '102', label: 'Room 102', subLabel: 'Occupied' },
                    { id: '103', label: 'Room 103', subLabel: 'Available' },
                    { id: '104', label: 'Room 104', subLabel: 'Available' },
                    { id: '105', label: 'Room 105', subLabel: 'Available' },
                ]}
                selectedId="103"
            />
            
            <SearchUI 
                visible={showSearchUI}
                onClose={() => setShowSearchUI(false)}
            />

            <NotificationsScreen 
                visible={showNotificationsUI}
                onClose={() => setShowNotificationsUI(false)}
            />

            <ActionSheet 
                visible={showActionSheet}
                onClose={() => setShowActionSheet(false)}
                title="Student Actions"
                options={[
                    { id: '1', label: 'Edit Profile', icon: 'pencil', onPress: () => {} },
                    { id: '2', label: 'Share Details', icon: 'share-social', onPress: () => {} },
                    { id: '3', label: 'Download Receipt', icon: 'download', onPress: () => {} },
                    { id: '4', label: 'Delete Student', icon: 'trash', isDanger: true, onPress: () => setShowDangerModal(true) },
                ]}
            />

            <DangerModal 
                visible={showDangerModal}
                title="Delete Student?"
                message="Are you absolutely sure you want to delete this student? This action cannot be undone and will erase all their records."
                confirmText="Yes, Delete"
                onCancel={() => setShowDangerModal(false)}
                onConfirm={() => {
                    setShowDangerModal(false);
                    Toast.show({ type: 'success', text1: 'Student Deleted Successfully' });
                }}
            />
        </>
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
        maxHeight: '90%',
        minHeight: '75%',
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: 20,
        paddingRight: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    closeBtn: {
        padding: 8,
        marginLeft: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
    },
    clearText: {
        fontSize: 14,
        fontWeight: '700',
    },
    scrollBody: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 12,
        marginTop: 8,
    },
    pillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },
    pill: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    pillText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
    },
    customRangeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 20,
    },
    customRangeText: {
        fontSize: 14,
        color: '#475569',
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        borderTopWidth: 1,
        borderColor: '#F1F5F9',
        gap: 12,
    },
    resetBtn: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    resetBtnText: {
        fontSize: 15,
        fontWeight: '700',
    },
    applyBtn: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    applyBtnText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFF',
    },
    demoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#FECACA',
        padding: 12,
        borderRadius: 10,
        gap: 8,
    },
    demoBtnText: {
        fontSize: 14,
        fontWeight: '600',
    }
});
