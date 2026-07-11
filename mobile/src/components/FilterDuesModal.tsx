import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../services/api';
import { CustomDateRangePicker } from './ui/pickers/CustomDateRangePicker';

export interface FilterDuesProps {
    visible: boolean;
    onClose: () => void;
    onApply: (filters: any) => void;
    initialFilters: any;
}

export function FilterDuesModal({ visible, onClose, onApply, initialFilters }: FilterDuesProps) {
    const { theme, isDark } = useTheme();
    const primary = theme?.primary || '#3B82F6';
    
    const [activeCategory, setActiveCategory] = useState<'sortBy' | 'dueDate' | 'defaulter' | 'rooms'>('sortBy');
    const [searchQuery, setSearchQuery] = useState('');

    const [status, setStatus] = useState('All');
    const [datePreset, setDatePreset] = useState('All Time');
    const [room, setRoom] = useState('All');
    const [sortBy, setSortBy] = useState('Due Date - Old to New');

    // Custom date range bounds
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [rangePickerVisible, setRangePickerVisible] = useState(false);
    
    const [rooms, setRooms] = useState<any[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(false);

    // Google Gemini search bar breathing glow animations
    const borderAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(borderAnim, { toValue: 1, duration: 4000, useNativeDriver: false }),
                    Animated.timing(borderAnim, { toValue: 0, duration: 4000, useNativeDriver: false })
                ])
            ).start();
        }
    }, [visible, borderAnim]);

    const animatedBorderColor = borderAnim.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: ['#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#3B82F6']
    });

    const animatedShadowColor = borderAnim.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: ['rgba(59, 130, 246, 0.3)', 'rgba(139, 92, 246, 0.3)', 'rgba(236, 72, 153, 0.3)', 'rgba(249, 115, 22, 0.3)', 'rgba(59, 130, 246, 0.3)']
    });

    // Dynamic current calendar month name (e.g. "July", "August")
    const currentMonthName = useMemo(() => {
        return new Date().toLocaleString('en-US', { month: 'long' });
    }, []);

    // Initialize state from initialFilters when modal opens & auto-focus the active category
    useEffect(() => {
        if (visible && initialFilters) {
            const initStatus = initialFilters.status || 'All';
            const initDate = initialFilters.datePreset || 'All Time';
            const initRoom = initialFilters.room || 'All';
            const initSort = initialFilters.sortBy || 'Due Date - Old to New';

            setStatus(initStatus);
            setDatePreset(initDate);
            setRoom(initRoom);
            setSortBy(initSort);
            setCustomStartDate(initialFilters.customStartDate || '');
            setCustomEndDate(initialFilters.customEndDate || '');

            // Auto-focus the category containing the active filter for better UX
            if (initRoom !== 'All') {
                setActiveCategory('rooms');
            } else if (initStatus !== 'All') {
                setActiveCategory('defaulter');
            } else if (initDate !== 'All Time') {
                setActiveCategory('dueDate');
            } else {
                setActiveCategory('sortBy');
            }
        }
    }, [visible, initialFilters]);

    useEffect(() => {
        if (visible && rooms.length === 0) {
            setLoadingRooms(true);
            api.get('/rooms')
               .then(res => setRooms(res.data?.data || []))
               .catch(err => console.error('Failed to load rooms', err))
               .finally(() => setLoadingRooms(false));
        }
    }, [visible]);

    const handleApply = () => {
        onApply({ status, datePreset, room, sortBy, customStartDate, customEndDate });
        onClose();
    };

    const handleReset = () => {
        setStatus('All');
        setDatePreset('All Time');
        setRoom('All');
        setSortBy('Due Date - Old to New');
        setCustomStartDate('');
        setCustomEndDate('');
    };

    const handleConfirmCustomRange = (start: Date, end: Date) => {
        const formatDate = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };
        setCustomStartDate(formatDate(start));
        setCustomEndDate(formatDate(end));
        setRangePickerVisible(false);
    };

    // Filter Options lists
    const sortOptions = [
        'Due Date - Old to New',
        'Due Date - New to Old',
        'Room Number',
        'Due Amount - High to Low',
        'Due Amount - Low to High'
    ];
    
    const dateOptions = useMemo(() => [
        'Custom Date Range',
        'All Time',
        'Today',
        'Yesterday',
        currentMonthName,
        'Last 30 Days',
        'Previous Month',
        'Last 3 Months',
        'Last 6 Months',
        'Last 12 Months',
        'Previous Year'
    ], [currentMonthName]);

    const statusOptions = ['All', 'Pending', 'Partial'];

    // Search query filters for each column list
    const filteredSortOptions = useMemo(() => {
        if (!searchQuery) return sortOptions;
        return sortOptions.filter(o => o.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [searchQuery]);

    const filteredDateOptions = useMemo(() => {
        if (!searchQuery) return dateOptions;
        return dateOptions.filter(o => o.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [searchQuery, dateOptions]);

    const filteredStatusOptions = useMemo(() => {
        if (!searchQuery) return statusOptions;
        return statusOptions.filter(o => o.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [searchQuery]);

    const filteredRoomsList = useMemo(() => {
        const allRooms = ['All', 'Unallocated', ...rooms.map(r => r.room_number)];
        if (!searchQuery) return allRooms;
        return allRooms.filter(o => o.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [rooms, searchQuery]);

    const RadioCircle = ({ selected }: { selected: boolean }) => (
        <View style={[
            S.radioCircle,
            { borderColor: selected ? primary : (isDark ? '#475569' : '#CBD5E1') }
        ]}>
            {selected && <View style={[S.radioDot, { backgroundColor: primary }]} />}
        </View>
    );

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={S.modalOverlay}>
                <View style={[S.modalContent, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                    {/* Header Left Aligned */}
                    <View style={[S.header, { borderBottomColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                        <TouchableOpacity onPress={onClose} style={S.backBtn}>
                            <Ionicons name="arrow-back" size={24} color={isDark ? '#F8FAFC' : '#1E293B'} />
                        </TouchableOpacity>
                        <Text style={[S.headerTitle, { color: isDark ? '#F8FAFC' : '#1E293B', marginLeft: 12 }]}>Dues Filter</Text>
                    </View>

                    {/* Search Filters Input with dynamic Gemini border glow animation */}
                    <View style={S.searchContainer}>
                        <Animated.View style={[S.searchBox, { 
                            backgroundColor: isDark ? '#1E293B' : '#FFF',
                            borderColor: animatedBorderColor,
                            shadowColor: animatedShadowColor,
                            shadowOpacity: 0.5,
                            shadowRadius: 10,
                        }]}>
                            <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
                            <TextInput
                                style={[S.searchInput, { color: isDark ? '#FFF' : '#1E293B' }]}
                                placeholder="Search Filters"
                                placeholderTextColor="#94A3B8"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                                </TouchableOpacity>
                            )}
                        </Animated.View>
                    </View>

                    {/* Active Filter Chips inside the Modal (Below Search Bar) */}
                    {(status !== 'All' || datePreset !== 'All Time' || room !== 'All' || sortBy !== 'Due Date - Old to New') && (
                        <View style={S.modalChipsRow}>
                            {status !== 'All' && (
                                <TouchableOpacity 
                                    style={[S.modalChip, { backgroundColor: isDark ? primary + '20' : primary + '10', borderColor: primary }]}
                                    onPress={() => setStatus('All')}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[S.modalChipText, { color: primary }]}>{status}</Text>
                                    <Ionicons name="close-circle" size={14} color={primary} />
                                </TouchableOpacity>
                            )}
                            {datePreset !== 'All Time' && (
                                <TouchableOpacity 
                                    style={[S.modalChip, { backgroundColor: isDark ? primary + '20' : primary + '10', borderColor: primary }]}
                                    onPress={() => { setDatePreset('All Time'); setCustomStartDate(''); setCustomEndDate(''); }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[S.modalChipText, { color: primary }]}>
                                        {datePreset === 'Custom Date Range' 
                                            ? (customStartDate ? `${customStartDate} to ${customEndDate}` : 'Custom Date')
                                            : datePreset}
                                    </Text>
                                    <Ionicons name="close-circle" size={14} color={primary} />
                                </TouchableOpacity>
                            )}
                            {room !== 'All' && (
                                <TouchableOpacity 
                                    style={[S.modalChip, { backgroundColor: isDark ? primary + '20' : primary + '10', borderColor: primary }]}
                                    onPress={() => setRoom('All')}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[S.modalChipText, { color: primary }]}>Room {room}</Text>
                                    <Ionicons name="close-circle" size={14} color={primary} />
                                </TouchableOpacity>
                            )}
                            {sortBy !== 'Due Date - Old to New' && (
                                <TouchableOpacity 
                                    style={[S.modalChip, { backgroundColor: isDark ? primary + '20' : primary + '10', borderColor: primary }]}
                                    onPress={() => setSortBy('Due Date - Old to New')}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[S.modalChipText, { color: primary }]}>Sort: {sortBy.split(' - ')[0]}</Text>
                                    <Ionicons name="close-circle" size={14} color={primary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Filter Panel (Two Columns) */}
                    <View style={[S.filterPanel, { 
                        backgroundColor: isDark ? '#1E293B' : '#FFF',
                        borderColor: isDark ? '#334155' : '#E2E8F0'
                    }]}>
                        {/* Left Tab menu */}
                        <View style={[S.leftColumn, { borderRightColor: isDark ? '#334155' : '#E2E8F0' }]}>
                            {/* Sort By tab */}
                            <TouchableOpacity
                                style={[
                                    S.categoryTab,
                                    activeCategory === 'sortBy' && [S.categoryTabActive, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]
                                ]}
                                onPress={() => { setActiveCategory('sortBy'); setSearchQuery(''); }}
                                activeOpacity={0.8}
                            >
                                <Text style={[
                                    S.categoryText,
                                    { color: activeCategory === 'sortBy' ? primary : (isDark ? '#94A3B8' : '#64748B') },
                                    activeCategory === 'sortBy' && { fontWeight: '800' }
                                ]}>
                                    Sort By
                                </Text>
                                {activeCategory === 'sortBy' && <View style={[S.activeIndicator, { backgroundColor: primary }]} />}
                            </TouchableOpacity>

                            {/* Due Date tab */}
                            <TouchableOpacity
                                style={[
                                    S.categoryTab,
                                    activeCategory === 'dueDate' && [S.categoryTabActive, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]
                                ]}
                                onPress={() => { setActiveCategory('dueDate'); setSearchQuery(''); }}
                                activeOpacity={0.8}
                            >
                                <Text style={[
                                    S.categoryText,
                                    { color: activeCategory === 'dueDate' ? primary : (isDark ? '#94A3B8' : '#64748B') },
                                    activeCategory === 'dueDate' && { fontWeight: '800' }
                                ]}>
                                    Due Date
                                </Text>
                                {activeCategory === 'dueDate' && <View style={[S.activeIndicator, { backgroundColor: primary }]} />}
                            </TouchableOpacity>

                            {/* Defaulter tab */}
                            <TouchableOpacity
                                style={[
                                    S.categoryTab,
                                    activeCategory === 'defaulter' && [S.categoryTabActive, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]
                                ]}
                                onPress={() => { setActiveCategory('defaulter'); setSearchQuery(''); }}
                                activeOpacity={0.8}
                            >
                                <Text style={[
                                    S.categoryText,
                                    { color: activeCategory === 'defaulter' ? primary : (isDark ? '#94A3B8' : '#64748B') },
                                    activeCategory === 'defaulter' && { fontWeight: '800' }
                                ]}>
                                    Defaulter
                                </Text>
                                {activeCategory === 'defaulter' && <View style={[S.activeIndicator, { backgroundColor: primary }]} />}
                            </TouchableOpacity>

                            {/* Rooms tab */}
                            <TouchableOpacity
                                style={[
                                    S.categoryTab,
                                    activeCategory === 'rooms' && [S.categoryTabActive, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]
                                ]}
                                onPress={() => { setActiveCategory('rooms'); setSearchQuery(''); }}
                                activeOpacity={0.8}
                            >
                                <Text style={[
                                    S.categoryText,
                                    { color: activeCategory === 'rooms' ? primary : (isDark ? '#94A3B8' : '#64748B') },
                                    activeCategory === 'rooms' && { fontWeight: '800' }
                                ]}>
                                    Rooms
                                </Text>
                                {activeCategory === 'rooms' && <View style={[S.activeIndicator, { backgroundColor: primary }]} />}
                            </TouchableOpacity>
                        </View>

                        {/* Right Content Panel (Options) */}
                        <View style={S.rightColumn}>
                            {loadingRooms && activeCategory === 'rooms' ? (
                                <View style={S.loaderWrap}>
                                    <ActivityIndicator size="small" color={primary} />
                                </View>
                            ) : (
                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.optionsScroll}>
                                    {activeCategory === 'sortBy' && filteredSortOptions.map(opt => {
                                        const isSelected = sortBy === opt;
                                        return (
                                            <TouchableOpacity
                                                key={opt}
                                                style={S.optionRow}
                                                onPress={() => setSortBy(opt)}
                                                activeOpacity={0.7}
                                            >
                                                <RadioCircle selected={isSelected} />
                                                <Text style={[S.optionText, { color: isDark ? '#E2E8F0' : '#334155' }]}>{opt}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}

                                    {activeCategory === 'dueDate' && filteredDateOptions.map(opt => {
                                        const isSelected = datePreset === opt;
                                        return (
                                            <View key={opt}>
                                                <TouchableOpacity
                                                    style={S.optionRow}
                                                    onPress={() => {
                                                        setDatePreset(opt);
                                                        if (opt === 'Custom Date Range') {
                                                            setRangePickerVisible(true);
                                                        }
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <RadioCircle selected={isSelected} />
                                                    <Text style={[S.optionText, { color: isDark ? '#E2E8F0' : '#334155' }]}>{opt}</Text>
                                                </TouchableOpacity>

                                                {opt === 'Custom Date Range' && isSelected && (
                                                    <TouchableOpacity 
                                                        style={[S.customRangeBanner, { 
                                                            backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                                                            borderColor: isDark ? '#334155' : '#CBD5E1'
                                                        }]}
                                                        onPress={() => setRangePickerVisible(true)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Ionicons name="calendar-outline" size={16} color={primary} style={{ marginRight: 6 }} />
                                                        <Text style={[S.customRangeText, { color: isDark ? '#CBD5E1' : '#475569', flex: 1 }]}>
                                                            {customStartDate ? `${customStartDate} to ${customEndDate}` : 'Select Date Range'}
                                                        </Text>
                                                        <Ionicons name="create-outline" size={14} color={primary} />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        );
                                    })}

                                    {activeCategory === 'defaulter' && filteredStatusOptions.map(opt => {
                                        const isSelected = status === opt;
                                        return (
                                            <TouchableOpacity
                                                key={opt}
                                                style={S.optionRow}
                                                onPress={() => setStatus(opt)}
                                                activeOpacity={0.7}
                                            >
                                                <RadioCircle selected={isSelected} />
                                                <Text style={[S.optionText, { color: isDark ? '#E2E8F0' : '#334155' }]}>{opt}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}

                                    {activeCategory === 'rooms' && filteredRoomsList.map(opt => {
                                        const isSelected = room === opt;
                                        return (
                                            <TouchableOpacity
                                                key={opt}
                                                style={S.optionRow}
                                                onPress={() => setRoom(opt)}
                                                activeOpacity={0.7}
                                            >
                                                <RadioCircle selected={isSelected} />
                                                <Text style={[S.optionText, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                                                    {opt === 'All' ? 'All Rooms' : (opt === 'Unallocated' ? 'Unallocated' : `Room ${opt}`)}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            )}
                        </View>
                    </View>

                    {/* Bottom Buttons */}
                    <View style={[S.footer, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                        <TouchableOpacity style={[S.clearBtn, { borderColor: primary }]} onPress={handleReset}>
                            <Text style={[S.clearBtnText, { color: primary }]}>Clear All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[S.applyBtn, { backgroundColor: primary }]} onPress={handleApply}>
                            <Text style={S.applyBtnText}>Apply</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Custom Date Range Picker Component */}
            <CustomDateRangePicker
                visible={rangePickerVisible}
                onClose={() => setRangePickerVisible(false)}
                onConfirm={handleConfirmCustomRange}
                initialStart={customStartDate ? new Date(customStartDate) : undefined}
                initialEnd={customEndDate ? new Date(customEndDate) : undefined}
            />
        </Modal>
    );
}

const S = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        flex: 1,
        marginTop: 0,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 48 : 28,
        paddingBottom: 14,
        borderBottomWidth: 1,
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1.5,
        paddingHorizontal: 14,
        height: 48,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },
    modalChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    modalChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 20,
        borderWidth: 1,
        gap: 4,
    },
    modalChipText: {
        fontSize: 12,
        fontWeight: '700',
    },
    filterPanel: {
        flex: 1,
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    leftColumn: {
        width: '38%',
        borderRightWidth: 1,
        paddingVertical: 10,
    },
    categoryTab: {
        paddingVertical: 18,
        paddingHorizontal: 14,
        position: 'relative',
        justifyContent: 'center',
    },
    categoryTabActive: {
        width: '100%',
    },
    categoryText: {
        fontSize: 13,
        fontWeight: '600',
    },
    activeIndicator: {
        position: 'absolute',
        right: 0,
        top: 10,
        bottom: 10,
        width: 3.5,
        borderTopLeftRadius: 2,
        borderBottomLeftRadius: 2,
    },
    rightColumn: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    optionsScroll: {
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    loaderWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        gap: 12,
    },
    optionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    radioCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioDot: {
        width: 9,
        height: 9,
        borderRadius: 4.5,
    },
    customRangeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        marginLeft: 30,
        marginTop: 2,
        marginBottom: 10,
    },
    customRangeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
        alignItems: 'center',
    },
    clearBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clearBtnText: {
        fontSize: 15,
        fontWeight: '800',
    },
    applyBtn: {
        flex: 1.2,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    applyBtnText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '800',
    },
});
