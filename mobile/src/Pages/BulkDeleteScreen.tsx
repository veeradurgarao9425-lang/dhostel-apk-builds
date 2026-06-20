import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    TextInput,
    StatusBar,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../services/api';
import { showSuccessToast, showErrorToast } from '../hooks/Toastconfig';
import { AppHeader } from '../components/AppHeader';

export default function BulkDeleteScreen() {
    const navigation = useNavigation<any>();
    const { theme, isDark, fontSize } = useTheme();

    const [activeTab, setActiveTab] = useState<'rooms' | 'expenses'>('rooms');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [search, setSearch] = useState('');

    // Data lists
    const [rooms, setRooms] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);

    // Selected IDs
    const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
    const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());

    // Fetch rooms from backend
    const fetchRooms = useCallback(async (isRefresh = false) => {
        if (!isRefresh && activeTab === 'rooms') setLoading(true);
        try {
            const res = await api.get('/rooms?limit=250');
            if (res.data.success) {
                setRooms(res.data.data || []);
            }
        } catch (e: any) {
            console.error('Failed to fetch rooms:', e);
            showErrorToast('Error', 'Failed to load rooms.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab]);

    // Fetch expenses from backend
    const fetchExpenses = useCallback(async (isRefresh = false) => {
        if (!isRefresh && activeTab === 'expenses') setLoading(true);
        try {
            const res = await api.get('/expenses');
            if (res.data.success) {
                setExpenses(res.data.data || []);
            }
        } catch (e: any) {
            console.error('Failed to fetch expenses:', e);
            showErrorToast('Error', 'Failed to load expenses.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab]);

    // Initial fetch and on tab change
    useEffect(() => {
        if (activeTab === 'rooms') {
            fetchRooms();
        } else {
            fetchExpenses();
        }
    }, [activeTab, fetchRooms, fetchExpenses]);

    // Handle Pull to Refresh
    const handleRefresh = () => {
        setRefreshing(true);
        if (activeTab === 'rooms') {
            setSelectedRooms(new Set());
            fetchRooms(true);
        } else {
            setSelectedExpenses(new Set());
            fetchExpenses(true);
        }
    };

    // Filters based on search query
    const filteredRooms = useMemo(() => {
        if (!search) return rooms;
        const q = search.toLowerCase();
        return rooms.filter(r => 
            r.room_number?.toString().includes(q) ||
            r.room_type_name?.toLowerCase().includes(q) ||
            (r.floor_number !== undefined && `floor ${r.floor_number}`.includes(q))
        );
    }, [rooms, search]);

    const filteredExpenses = useMemo(() => {
        if (!search) return expenses;
        const q = search.toLowerCase();
        return expenses.filter(e => 
            e.category_name?.toLowerCase().includes(q) ||
            e.description?.toLowerCase().includes(q) ||
            e.amount?.toString().includes(q) ||
            e.expense_date?.includes(q)
        );
    }, [expenses, search]);

    // Selection Handlers
    const toggleRoomSelection = (roomId: string) => {
        const next = new Set(selectedRooms);
        if (next.has(roomId)) {
            next.delete(roomId);
        } else {
            next.add(roomId);
        }
        setSelectedRooms(next);
    };

    const toggleExpenseSelection = (expenseId: string) => {
        const next = new Set(selectedExpenses);
        if (next.has(expenseId)) {
            next.delete(expenseId);
        } else {
            next.add(expenseId);
        }
        setSelectedExpenses(next);
    };

    // Toggle Select All for active filtered list
    const isAllSelected = useMemo(() => {
        const currentFiltered = activeTab === 'rooms' ? filteredRooms : filteredExpenses;
        if (currentFiltered.length === 0) return false;
        
        const currentSelected = activeTab === 'rooms' ? selectedRooms : selectedExpenses;
        return currentFiltered.every(item => {
            const id = activeTab === 'rooms' ? item.room_id.toString() : item.expense_id.toString();
            return currentSelected.has(id);
        });
    }, [activeTab, filteredRooms, filteredExpenses, selectedRooms, selectedExpenses]);

    const toggleSelectAll = () => {
        if (activeTab === 'rooms') {
            const currentSelected = new Set(selectedRooms);
            if (isAllSelected) {
                // Deselect all filtered items
                filteredRooms.forEach(r => currentSelected.delete(r.room_id.toString()));
            } else {
                // Select all filtered items
                filteredRooms.forEach(r => currentSelected.add(r.room_id.toString()));
            }
            setSelectedRooms(currentSelected);
        } else {
            const currentSelected = new Set(selectedExpenses);
            if (isAllSelected) {
                // Deselect all filtered items
                filteredExpenses.forEach(e => currentSelected.delete(e.expense_id.toString()));
            } else {
                // Select all filtered items
                filteredExpenses.forEach(e => currentSelected.add(e.expense_id.toString()));
            }
            setSelectedExpenses(currentSelected);
        }
    };

    // Deletion Process
    const handleBulkDelete = () => {
        const count = activeTab === 'rooms' ? selectedRooms.size : selectedExpenses.size;
        if (count === 0) return;

        Alert.alert(
            `Delete ${count} Selected Item${count > 1 ? 's' : ''}?`,
            `Are you sure you want to permanently delete the selected ${count} ${activeTab}? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: `Delete Selected`,
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        const selectedIds = Array.from(activeTab === 'rooms' ? selectedRooms : selectedExpenses);
                        let successCount = 0;
                        let failCount = 0;
                        let lastError = '';

                        for (const id of selectedIds) {
                            try {
                                const url = activeTab === 'rooms' ? `/rooms/${id}` : `/expenses/${id}`;
                                const response = await api.delete(url);
                                if (response.data.success) {
                                    successCount++;
                                } else {
                                    failCount++;
                                    lastError = response.data.message || 'Deletion rejected by server';
                                }
                            } catch (err: any) {
                                failCount++;
                                lastError = err.response?.data?.error || err.response?.data?.message || err.message || 'Server error';
                                console.error(`Error deleting item ${id}:`, err);
                            }
                        }

                        setDeleting(false);

                        if (successCount > 0) {
                            showSuccessToast(
                                `${activeTab === 'rooms' ? 'Rooms' : 'Expenses'} Deleted`,
                                `Successfully deleted ${successCount} item(s).`
                            );
                        }

                        if (failCount > 0) {
                            Alert.alert(
                                'Deletions Completed with Warnings',
                                `Successfully deleted: ${successCount} item(s).\nFailed to delete: ${failCount} item(s).\n\nLast Error: ${lastError}`,
                                [{ text: 'OK' }]
                            );
                        }

                        // Reset selections & reload
                        if (activeTab === 'rooms') {
                            setSelectedRooms(new Set());
                            fetchRooms();
                        } else {
                            setSelectedExpenses(new Set());
                            fetchExpenses();
                        }
                    }
                }
            ]
        );
    };

    // Render List Card
    const renderRoomCard = ({ item }: { item: any }) => {
        const id = item.room_id.toString();
        const isSelected = selectedRooms.has(id);
        const avail = item.available_beds ?? 0;
        const total = item.total_capacity ?? item.capacity ?? 0;
        const occ = Math.max(0, total - avail);

        const statusColor = item.status === 'MAINTENANCE' ? '#F97316' : avail > 0 ? '#16A34A' : '#DC2626';

        return (
            <TouchableOpacity
                style={[
                    styles.card,
                    { 
                        backgroundColor: theme.cardBg, 
                        borderColor: isSelected ? theme.primary : (isDark ? '#334155' : '#F1F5F9')
                    }
                ]}
                activeOpacity={0.8}
                onPress={() => toggleRoomSelection(id)}
            >
                {/* Custom Checkbox */}
                <View style={styles.checkboxContainer}>
                    <View style={[
                        styles.customCheckbox,
                        { borderColor: isDark ? '#475569' : '#CBD5E1' },
                        isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}>
                        {isSelected && <Ionicons name="checkmark" size={13} color="#FFF" />}
                    </View>
                </View>

                {/* Card Content */}
                <View style={styles.cardContent}>
                    <View style={styles.cardHeaderRow}>
                        <Text style={[styles.cardTitle, { color: theme.textPrimary, fontSize: fontSize + 1 }]}>
                            Room {item.room_number}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                            <Text style={[styles.statusBadgeText, { color: statusColor, fontSize: fontSize - 3 }]}>
                                {item.status === 'MAINTENANCE' ? 'Maintenance' : `${occ}/${total} Occupied`}
                            </Text>
                        </View>
                    </View>
                    
                    <Text style={[styles.cardSubtitle, { color: theme.textSecondary, fontSize: fontSize - 2 }]}>
                        {item.room_type_name || 'Standard'} Room • Floor {item.floor_number ?? '0'}
                    </Text>

                    <View style={styles.infoFooter}>
                        <Ionicons name="card-outline" size={14} color={theme.textSecondary} />
                        <Text style={[styles.footerText, { color: theme.textSecondary, fontSize: fontSize - 2 }]}>
                            Rent: ₹{item.rent_per_bed ?? item.base_rent ?? '—'}/bed
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderExpenseCard = ({ item }: { item: any }) => {
        const id = item.expense_id.toString();
        const isSelected = selectedExpenses.has(id);

        return (
            <TouchableOpacity
                style={[
                    styles.card,
                    { 
                        backgroundColor: theme.cardBg, 
                        borderColor: isSelected ? theme.primary : (isDark ? '#334155' : '#F1F5F9')
                    }
                ]}
                activeOpacity={0.8}
                onPress={() => toggleExpenseSelection(id)}
            >
                {/* Custom Checkbox */}
                <View style={styles.checkboxContainer}>
                    <View style={[
                        styles.customCheckbox,
                        { borderColor: isDark ? '#475569' : '#CBD5E1' },
                        isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}>
                        {isSelected && <Ionicons name="checkmark" size={13} color="#FFF" />}
                    </View>
                </View>

                {/* Card Content */}
                <View style={styles.cardContent}>
                    <View style={styles.cardHeaderRow}>
                        <Text style={[styles.cardTitle, { color: theme.textPrimary, fontSize: fontSize + 1 }]} numberOfLines={1}>
                            {item.category_name || 'General Expense'}
                        </Text>
                        <Text style={[styles.amountText, { color: '#F59E0B', fontSize: fontSize + 1 }]}>
                            ₹{item.amount}
                        </Text>
                    </View>

                    <Text style={[styles.cardSubtitle, { color: theme.textSecondary, fontSize: fontSize - 2 }]} numberOfLines={2}>
                        {item.description || 'No description provided'}
                    </Text>

                    <View style={styles.infoFooter}>
                        <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
                        <Text style={[styles.footerText, { color: theme.textSecondary, fontSize: fontSize - 2 }]}>
                            {item.expense_date ? new Date(item.expense_date).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            }) : '—'}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const activeList = activeTab === 'rooms' ? filteredRooms : filteredExpenses;
    const selectedCount = activeTab === 'rooms' ? selectedRooms.size : selectedExpenses.size;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <AppHeader 
                title="Bulk Delete"
                subtitle={`Batch remove rooms or expenses from your database`}
            />

            {/* Premium Tab Control */}
            <View style={[styles.tabBar, { borderBottomColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'rooms' && { borderBottomColor: theme.primary }]}
                    onPress={() => { setActiveTab('rooms'); setSearch(''); }}
                    activeOpacity={0.7}
                >
                    <Ionicons name="bed-outline" size={18} color={activeTab === 'rooms' ? theme.primary : theme.textSecondary} />
                    <Text style={[
                        styles.tabText, 
                        { color: activeTab === 'rooms' ? theme.primary : theme.textSecondary, fontSize },
                        activeTab === 'rooms' && styles.activeTabText
                    ]}>
                        Rooms ({rooms.length})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'expenses' && { borderBottomColor: theme.primary }]}
                    onPress={() => { setActiveTab('expenses'); setSearch(''); }}
                    activeOpacity={0.7}
                >
                    <Ionicons name="cash-outline" size={18} color={activeTab === 'expenses' ? theme.primary : theme.textSecondary} />
                    <Text style={[
                        styles.tabText, 
                        { color: activeTab === 'expenses' ? theme.primary : theme.textSecondary, fontSize },
                        activeTab === 'expenses' && styles.activeTabText
                    ]}>
                        Expenses ({expenses.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Filter Search Bar */}
            <View style={styles.searchSection}>
                <View style={[styles.searchBarWrap, { backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                    <Ionicons name="search" size={18} color={theme.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.textPrimary, fontSize }]}
                        placeholder={`Search filtered ${activeTab}...`}
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Select All Row */}
            {activeList.length > 0 && (
                <View style={[styles.selectAllRow, { borderBottomColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                    <TouchableOpacity style={styles.selectAllBtn} onPress={toggleSelectAll} activeOpacity={0.7}>
                        <View style={[
                            styles.customCheckbox,
                            { borderColor: isDark ? '#475569' : '#CBD5E1', marginRight: 10 },
                            isAllSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
                        ]}>
                            {isAllSelected && <Ionicons name="checkmark" size={13} color="#FFF" />}
                        </View>
                        <Text style={[styles.selectAllText, { color: theme.textPrimary, fontSize: fontSize - 1 }]}>
                            {isAllSelected ? 'Deselect All' : 'Select All Filtered'}
                        </Text>
                    </TouchableOpacity>

                    {selectedCount > 0 && (
                        <Text style={[styles.selectedCountLabel, { color: theme.primary, fontSize: fontSize - 2 }]}>
                            {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
                        </Text>
                    )}
                </View>
            )}

            {/* Main Content List */}
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={{ marginTop: 12, color: theme.textSecondary, fontWeight: '500', fontSize }}>
                        Loading data...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={activeList}
                    keyExtractor={(item) => activeTab === 'rooms' ? item.room_id.toString() : item.expense_id.toString()}
                    renderItem={activeTab === 'rooms' ? renderRoomCard : renderExpenseCard}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
                                <Ionicons name={activeTab === 'rooms' ? 'bed-outline' : 'cash-outline'} size={40} color={theme.textSecondary} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: theme.textPrimary, fontSize: fontSize + 1 }]}>
                                No {activeTab} found
                            </Text>
                            <Text style={[styles.emptySubtitle, { color: theme.textSecondary, fontSize: fontSize - 2 }]}>
                                {search ? 'Try adjusting your search filters.' : `There are no ${activeTab} available in your database.`}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Sticky Action Footer */}
            <View style={[
                styles.stickyFooter,
                { 
                    backgroundColor: isDark ? '#1E293B' : '#FFF', 
                    borderTopColor: isDark ? '#334155' : '#F1F5F9'
                }
            ]}>
                <TouchableOpacity
                    style={[
                        styles.deleteButton,
                        selectedCount === 0 && styles.disabledButton,
                        deleting && { opacity: 0.8 }
                    ]}
                    disabled={selectedCount === 0 || deleting}
                    onPress={handleBulkDelete}
                    activeOpacity={0.8}
                >
                    {deleting ? (
                        <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                        <>
                            <Ionicons name="trash-outline" size={18} color="#FFF" />
                            <Text style={[styles.deleteButtonText, { fontSize }]}>
                                Delete Selected ({selectedCount})
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    // Tab controls
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
        gap: 8,
    },
    tabText: {
        fontWeight: '600',
    },
    activeTabText: {
        fontWeight: '800',
    },

    // Search bar
    searchSection: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 8,
    },
    searchBarWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 48,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontWeight: '600',
    },

    // Select All Row
    selectAllRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    selectAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectAllText: {
        fontWeight: '700',
    },
    selectedCountLabel: {
        fontWeight: '700',
    },

    // List & cards
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    card: {
        flexDirection: 'row',
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1.5,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.02,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    checkboxContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    customCheckbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContent: {
        flex: 1,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    cardTitle: {
        fontWeight: '800',
        flex: 1,
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    statusBadgeText: {
        fontWeight: '800',
    },
    amountText: {
        fontWeight: '900',
    },
    cardSubtitle: {
        fontWeight: '500',
        lineHeight: 16,
        marginBottom: 10,
    },
    infoFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    footerText: {
        fontWeight: '600',
    },

    // Empty state
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
        paddingHorizontal: 32,
    },
    emptyIconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontWeight: '700',
        marginBottom: 6,
    },
    emptySubtitle: {
        textAlign: 'center',
        lineHeight: 19,
        fontWeight: '500',
    },

    // Sticky Action Footer
    stickyFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderTopWidth: 1,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#DC2626',
        borderRadius: 14,
        height: 50,
        gap: 8,
    },
    disabledButton: {
        backgroundColor: '#FDA4AF',
        opacity: 0.6,
    },
    deleteButtonText: {
        color: '#FFF',
        fontWeight: '800',
    },
});
