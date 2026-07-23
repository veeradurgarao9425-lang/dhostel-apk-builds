import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { CustomDateRangePicker } from './ui/pickers/CustomDateRangePicker';
import { CustomDatePicker } from './ui/pickers/CustomDatePicker';
import { CustomMonthYearPicker } from './ui/pickers/CustomMonthYearPicker';
import { CustomTimePicker } from './ui/pickers/CustomTimePicker';
import { CustomDateTimePicker } from './ui/pickers/CustomDateTimePicker';
import { SelectionModal } from './ui/SelectionModal';
import { SearchUI } from './ui/SearchScreen';
import { NotificationsScreen } from './ui/NotificationsScreen';
import { useNetwork } from './ui/NetworkManager';
import { SkeletonCard } from './ui/SkeletonCard';
import { SkeletonLoader } from './ui/SkeletonLoader';
import { SkeletonDetails } from './ui/SkeletonDetails';
import { EmptyState } from './ui/EmptyState';
import { ActionSheet } from './ui/ActionSheet';
import { DangerModal } from './ui/DangerModal';
import { StatCard } from './ui/StatCard';
import Toast from 'react-native-toast-message';

export function TestUIModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { theme, isDark } = useTheme();
    const primary = theme?.primary || '#8B291A';
    
    // Demo states
    const [showSingleDate, setShowSingleDate] = useState(false);
    const [showMonthYear, setShowMonthYear] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showDateTimePicker, setShowDateTimePicker] = useState(false);
    const [showRangePicker, setShowRangePicker] = useState(false);
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [showSearchUI, setShowSearchUI] = useState(false);
    const [showNotificationsUI, setShowNotificationsUI] = useState(false);
    const [showActionSheet, setShowActionSheet] = useState(false);
    const [showDangerModal, setShowDangerModal] = useState(false);
    const [showEmptyState, setShowEmptyState] = useState(false);
    const { simulateBanner, simulateScreen } = useNetwork();

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={S.modalOverlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                <View style={[S.modalContent, { backgroundColor: isDark ? '#1E293B' : '#FFF' }]}>
                    <View style={S.modalHeader}>
                        <Text style={[S.modalTitle, { color: theme.textPrimary }]}>Test UI Components</Text>
                        <TouchableOpacity onPress={onClose} style={S.closeBtn}>
                            <Ionicons name="close" size={24} color={theme.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={S.scrollContent} showsVerticalScrollIndicator={false}>
                        <Text style={[S.sectionTitle, { color: theme.textSecondary }]}>Premium Pickers (v1.1)</Text>
                        
                        <View style={S.gridContainer}>
                            <TouchableOpacity style={[S.demoBtn, { borderColor: primary }]} onPress={() => setShowSingleDate(true)}>
                                <Ionicons name="calendar-outline" size={28} color={primary} />
                                <Text style={[S.demoBtnTxt, { color: primary }]}>Single Date</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[S.demoBtn, { borderColor: primary }]} onPress={() => setShowMonthYear(true)}>
                                <Ionicons name="calendar-sharp" size={28} color={primary} />
                                <Text style={[S.demoBtnTxt, { color: primary }]}>Month & Year</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[S.demoBtn, { borderColor: primary }]} onPress={() => setShowTimePicker(true)}>
                                <Ionicons name="time-outline" size={28} color={primary} />
                                <Text style={[S.demoBtnTxt, { color: primary }]}>Time Picker</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[S.demoBtn, { borderColor: primary }]} onPress={() => setShowDateTimePicker(true)}>
                                <Ionicons name="stopwatch-outline" size={28} color={primary} />
                                <Text style={[S.demoBtnTxt, { color: primary }]}>Date & Time</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[S.demoBtn, { borderColor: primary }]} onPress={() => setShowRangePicker(true)}>
                                <Ionicons name="calendar-number-outline" size={28} color={primary} />
                                <Text style={[S.demoBtnTxt, { color: primary }]}>Date Range</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={[S.sectionTitle, { color: theme.textSecondary }]}>Interactive Modals</Text>

                        <View style={S.gridContainer}>
                            <TouchableOpacity style={[S.demoBtn, { borderColor: primary }]} onPress={() => setShowSelectionModal(true)}>
                                <Ionicons name="list-outline" size={28} color={primary} />
                                <Text style={[S.demoBtnTxt, { color: primary }]}>Selection List</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity style={[S.demoBtn, { borderColor: primary }]} onPress={() => setShowActionSheet(true)}>
                                <Ionicons name="menu-outline" size={28} color={primary} />
                                <Text style={[S.demoBtnTxt, { color: primary }]}>Action Sheet</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[S.demoBtn, { borderColor: '#DC2626' }]} onPress={() => setShowDangerModal(true)}>
                                <Ionicons name="warning-outline" size={28} color="#DC2626" />
                                <Text style={[S.demoBtnTxt, { color: '#DC2626' }]}>Danger Confirm</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={[S.sectionTitle, { color: theme.textSecondary }]}>Network & Feedback</Text>

                        <View style={S.gridContainer}>
                            <TouchableOpacity style={[S.demoBtn, { borderColor: '#F59E0B' }]} onPress={() => simulateBanner('offline')}>
                                <Ionicons name="flash-outline" size={28} color="#F59E0B" />
                                <Text style={[S.demoBtnTxt, { color: '#F59E0B' }]}>Network Banner</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[S.demoBtn, { borderColor: '#DC2626' }]} onPress={() => simulateScreen('OFFLINE')}>
                                <Ionicons name="cloud-offline-outline" size={28} color="#DC2626" />
                                <Text style={[S.demoBtnTxt, { color: '#DC2626' }]}>Offline Screen</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity style={[S.demoBtn, { borderColor: '#10B981' }]} onPress={() => Toast.show({ type: 'success', text1: 'Success', text2: 'Operation completed normally' })}>
                                <Ionicons name="checkmark-circle-outline" size={28} color="#10B981" />
                                <Text style={[S.demoBtnTxt, { color: '#10B981' }]}>Success Toast</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={[S.sectionTitle, { color: theme.textSecondary }]}>Complex Screens</Text>

                        <View style={S.gridContainer}>
                            <TouchableOpacity style={[S.demoBtn, { borderColor: '#8B5CF6' }]} onPress={() => setShowSearchUI(true)}>
                                <Ionicons name="search-outline" size={28} color="#8B5CF6" />
                                <Text style={[S.demoBtnTxt, { color: '#8B5CF6' }]}>Search Screen</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[S.demoBtn, { borderColor: '#3B82F6' }]} onPress={() => setShowNotificationsUI(true)}>
                                <Ionicons name="notifications-outline" size={28} color="#3B82F6" />
                                <Text style={[S.demoBtnTxt, { color: '#3B82F6' }]}>Notifications</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity style={[S.demoBtn, { borderColor: '#64748B' }]} onPress={() => setShowEmptyState(true)}>
                                <Ionicons name="file-tray-outline" size={28} color="#64748B" />
                                <Text style={[S.demoBtnTxt, { color: '#64748B' }]}>Empty State</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={[S.sectionTitle, { color: theme.textSecondary, marginTop: 24 }]}>Cards & States</Text>

                        <View style={{ marginBottom: 12 }}>
                            <StatCard 
                                title="Total Earnings" 
                                value="₹12,500" 
                                icon="wallet-outline" 
                                colorTheme="purple"
                                pillText="+12%" 
                            />
                        </View>

                        <Text style={[S.demoSubtitle, { color: theme.textPrimary }]}>Skeleton Loader Example:</Text>
                        <View style={{ marginBottom: 16 }}>
                            <SkeletonCard />
                            <View style={{ marginTop: 12 }} />
                            <SkeletonDetails />
                        </View>

                        <TouchableOpacity style={[S.demoBtn, { borderColor: primary, marginBottom: 40 }]} onPress={() => setShowEmptyState(true)}>
                            <Ionicons name="flask-outline" size={20} color={primary} />
                            <Text style={[S.demoBtnTxt, { color: primary }]}>Show Empty State Template</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>

            {/* Test Modals */}
            <CustomDatePicker visible={showSingleDate} onClose={() => setShowSingleDate(false)} onConfirm={() => setShowSingleDate(false)} />
            <CustomMonthYearPicker visible={showMonthYear} onClose={() => setShowMonthYear(false)} onConfirm={() => setShowMonthYear(false)} />
            <CustomTimePicker visible={showTimePicker} onClose={() => setShowTimePicker(false)} onConfirm={() => setShowTimePicker(false)} />
            <CustomDateTimePicker visible={showDateTimePicker} onClose={() => setShowDateTimePicker(false)} onConfirm={() => setShowDateTimePicker(false)} />
            <CustomDateRangePicker visible={showRangePicker} onClose={() => setShowRangePicker(false)} onConfirm={() => setShowRangePicker(false)} />
            
            <SelectionModal 
                visible={showSelectionModal} 
                onClose={() => setShowSelectionModal(false)} 
                title="Select Category"
                items={[{id:'1',label:'Rent'},{id:'2',label:'Maintenance'},{id:'3',label:'Electricity'}]}
                onConfirm={() => setShowSelectionModal(false)} 
            />

            <ActionSheet 
                visible={showActionSheet} 
                onClose={() => setShowActionSheet(false)}
                title="Manage Tenant"
                options={[
                    { id: '1', label: 'Edit Details', icon: 'create-outline', onPress: () => setShowActionSheet(false) },
                    { id: '2', label: 'View Contract', icon: 'document-text-outline', onPress: () => setShowActionSheet(false) },
                    { id: '3', label: 'Collect Payment', icon: 'cash-outline', onPress: () => setShowActionSheet(false) },
                    { id: '4', label: 'Remove Tenant', icon: 'trash-outline', isDanger: true, onPress: () => setShowActionSheet(false) },
                ]}
            />

            <DangerModal 
                visible={showDangerModal}
                onCancel={() => setShowDangerModal(false)}
                onConfirm={() => setShowDangerModal(false)}
                title="Delete Tenant?"
                message="Are you sure you want to completely remove this tenant? This action cannot be undone and will delete all payment history."
                confirmText="Yes, Delete Tenant"
            />

            {showSearchUI && (
                <SearchUI 
                    visible={showSearchUI}
                    onClose={() => setShowSearchUI(false)}
                />
            )}

            {showNotificationsUI && (
                <NotificationsScreen visible={showNotificationsUI} onClose={() => setShowNotificationsUI(false)} />
            )}

            {showEmptyState && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', zIndex: 999 }]}>
                    <TouchableOpacity 
                        style={{ position: 'absolute', top: 50, right: 20, zIndex: 1000, padding: 10, backgroundColor: isDark ? '#1E293B' : '#FFF', borderRadius: 20 }} 
                        onPress={() => setShowEmptyState(false)}
                    >
                        <Ionicons name="close" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <EmptyState 
                        icon="folder-open-outline"
                        title="No Data Found"
                        subtitle="There are no items to display right now. Try adding a new item or clear your filters."
                        actionLabel="Add New Item"
                        onAction={() => setShowEmptyState(false)}
                    />
                </View>
            )}
        </Modal>
    );
}

const S = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'flex-start',
    },
    modalContent: {
        flex: 1,
        padding: 20,
        paddingTop: 50,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '800',
    },
    closeBtn: {
        padding: 6,
        backgroundColor: 'rgba(148, 163, 184, 0.15)',
        borderRadius: 20,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 20,
        marginBottom: 16,
    },
    demoSubtitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    demoBtn: {
        width: '48%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        paddingHorizontal: 12,
        borderWidth: 1.5,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        marginBottom: 4,
    },
    demoBtnTxt: {
        fontSize: 13,
        fontWeight: '700',
        marginTop: 10,
        textAlign: 'center',
    },
});
