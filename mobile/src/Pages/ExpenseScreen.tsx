import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    FlatList,
    TouchableOpacity,
    TextInput,
    StatusBar,
    ActivityIndicator,
    RefreshControl,
    Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Search, Calendar, ChevronDown, Tag, X, Edit3, Trash2 } from 'lucide-react-native';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../../contexts/AuthContext';
import api from '../services/api';
import Toast from 'react-native-toast-message';
import { ProfileMenu } from '../components/ProfileMenu';
import { useTheme } from '../../contexts/ThemeContext';
import { HeaderNotification } from '../components/HeaderNotification';
import DateTimePickerModal from "react-native-modal-datetime-picker";

const CAT_COLORS: Record<string, string> = {
    'Electricity': '#F59E0B',
    'Water': '#0EA5E9',
    'Maintenance': '#8B5CF6',
    'Salary': '#10B981',
    'Groceries': '#F97316',
    'Internet': '#06B6D4',
    'Cleaning': '#EC4899',
    'Other': '#64748B',
};

const getCatColor = (name: string) => CAT_COLORS[name] || '#64748B';

export const ExpenseScreen = ({ navigation }: any) => {
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentDate, setCurrentDate] = useState<Date | null>(null);
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [totalExpenses, setTotalExpenses] = useState(0);
    const [monthExpensesTotal, setMonthExpensesTotal] = useState(0);

    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => setDebouncedSearch(search), 350);
        return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
    }, [search]);

    const fetchExpenses = async (pageNum = 1, isSilent = false) => {
        try {
            if (pageNum === 1) {
                if (!isSilent) setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const params: Record<string, any> = { page: pageNum, limit: 10 };
            if (debouncedSearch) params.search = debouncedSearch;
            
            if (currentDate) {
                const y = currentDate.getFullYear();
                const m = currentDate.getMonth() + 1;
                const lastDay = new Date(y, m, 0).getDate();
                params.startDate = `${y}-${String(m).padStart(2, '0')}-01`;
                params.endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            }

            const response = await api.get('/expenses', { params });
            if (response.data.success) {
                const newData = response.data.data || [];
                if (newData.length < 10) setHasMore(false);
                else setHasMore(true);

                setExpenses(prev => {
                    if (pageNum === 1) return newData;
                    const existingIds = new Set(prev.map(e => e.expense_id));
                    const unique = newData.filter((e: any) => !existingIds.has(e.expense_id));
                    return [...prev, ...unique];
                });

                setTotalExpenses(response.data.totalExpenses || 0);
                setMonthExpensesTotal(response.data.monthExpensesTotal || 0);
            }
        } catch (error) {
            console.error('Error fetching expenses:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to fetch expenses',
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    const handleDelete = (expense: any) => {
        Alert.alert(
            'Delete Expense',
            `Are you sure you want to delete this expense of ₹${parseFloat(expense.amount || 0).toLocaleString('en-IN')}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const response = await api.delete(`/expenses/${expense.expense_id}`);
                            if (response.data.success) {
                                Toast.show({
                                    type: 'success',
                                    text1: 'Success',
                                    text2: 'Expense deleted successfully',
                                });
                                fetchExpenses(1, true);
                            } else {
                                Toast.show({
                                    type: 'error',
                                    text1: 'Error',
                                    text2: response.data.message || 'Failed to delete expense',
                                });
                            }
                        } catch (error) {
                            console.error('Error deleting expense:', error);
                            Toast.show({
                                type: 'error',
                                text1: 'Error',
                                text2: 'Failed to delete expense',
                            });
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    useEffect(() => {
        setPage(1);
        setHasMore(true);
        fetchExpenses(1, false);
    }, [debouncedSearch, currentDate]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            setPage(1);
            setHasMore(true);
            fetchExpenses(1, true);
        });
        return unsubscribe;
    }, [navigation]);

    const getMonthLabel = () => {
        if (!currentDate) return 'All time';
        return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    };

    const handleConfirmDate = (date: Date) => {
        setCurrentDate(date);
        setDatePickerVisibility(false);
    };

    const filteredExpenses = expenses;

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        } catch {
            return dateStr;
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header */}
            <AppHeader
                title="Expenses"
                rightComponent={
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <HeaderNotification navigation={navigation} />
                        <ProfileMenu />
                    </View>
                }
            >
                {/* Expense Stats */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.2)' }]}>
                        <Text style={styles.statLabel}>Total Expenses</Text>
                        <Text style={styles.statValue}>₹{totalExpenses.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.2)' }]}>
                        <Text style={styles.statLabel}>
                            {currentDate ? getMonthLabel() : 'This Month'}
                        </Text>
                        <Text style={styles.statValue}>₹{monthExpensesTotal.toLocaleString('en-IN')}</Text>
                    </View>
                </View>
            </AppHeader>

            {/* Search Bar */}
            <View style={styles.searchSection}>
                <View style={[styles.searchBar, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                    <Search color={isDark ? '#94A3B8' : "#999999"} size={20} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.textPrimary }]}
                        placeholder="Search expenses..."
                        placeholderTextColor={isDark ? '#64748B' : "#999999"}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <X color={isDark ? '#94A3B8' : "#999999"} size={16} />
                        </TouchableOpacity>
                    )}
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <TouchableOpacity 
                        style={[styles.monthPicker, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                        onPress={() => setDatePickerVisibility(true)}
                    >
                        <Calendar color={isDark ? '#94A3B8' : "#666666"} size={18} />
                        <Text style={[styles.monthText, { color: theme.textSecondary }]}>{getMonthLabel()}</Text>
                        <ChevronDown color={isDark ? '#94A3B8' : "#666666"} size={16} />
                    </TouchableOpacity>
                    {currentDate && (
                        <TouchableOpacity 
                            style={[styles.clearMonthButton, { backgroundColor: isDark ? '#3F2222' : '#FFF1F1', borderColor: isDark ? '#7F1D1D' : '#FEE2E2' }]}
                            onPress={() => setCurrentDate(null)}
                        >
                            <X color="#FF6B6B" size={16} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Expense List */}
            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlatList
                    data={expenses}
                    keyExtractor={(item) => `exp-${item.expense_id}`}
                    renderItem={({ item: expense }) => {
                        const color = getCatColor(expense.category_name);
                        return (
                            <TouchableOpacity
                                key={`exp-${expense.expense_id}`}
                                style={[styles.premiumCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : 'transparent', borderWidth: isDark ? 1 : 0 }]}
                                onPress={() => {
                                    if (expense.is_wage) {
                                        Toast.show({ type: 'info', text1: 'Staff Wage', text2: 'Manage this from Staff → Payments.' });
                                        return;
                                    }
                                    navigation.navigate('ExpenseDetails', { expense });
                                }}
                                activeOpacity={0.9}
                            >
                                <View style={[styles.cardAccentLine, { backgroundColor: color }]} />
                                <View style={styles.cardInner}>
                                    <View style={styles.cardHeaderRow}>
                                        <View style={[styles.cardAvatarBg, { backgroundColor: isDark ? color + '25' : color + '15' }]}>
                                            <Tag size={18} color={color} />
                                        </View>
                                        <View style={styles.cardNameBlock}>
                                            <Text style={[styles.cardNameText, { color: theme.textPrimary }]} numberOfLines={1}>{expense.category_name}</Text>
                                            {expense.vendor_name && (
                                                <View style={[styles.roomBadge, { backgroundColor: isDark ? color + '25' : color + '15' }]}>
                                                    <Text style={[styles.roomBadgeText, { color }]}>{expense.vendor_name}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={styles.cardRightBlock}>
                                            <Text style={[styles.cardAmtText, { color: '#EF4444' }]}>
                                                -₹{parseFloat(expense.amount || 0).toLocaleString('en-IN')}
                                            </Text>
                                            <Text style={styles.cardStatusSub}>Deducted</Text>
                                        </View>
                                    </View>

                                    {expense.description && (
                                        <Text style={[styles.descriptionText, { color: theme.textSecondary }]} numberOfLines={2}>
                                            {expense.description}
                                        </Text>
                                    )}

                                    <View style={[styles.columnsBlock, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
                                        <View style={styles.colItem}>
                                            <Text style={styles.colLabel}>Total</Text>
                                            <Text style={[styles.colValue, { color: theme.textPrimary }]}>₹{parseFloat(expense.amount || 0).toLocaleString('en-IN')}</Text>
                                        </View>
                                        <View style={styles.colDivider} />
                                        <View style={styles.colItem}>
                                            <Text style={[styles.colLabel, { color: '#059669' }]}>Paid</Text>
                                            <Text style={[styles.colValue, { color: '#059669' }]}>₹{parseFloat(expense.amount || 0).toLocaleString('en-IN')}</Text>
                                        </View>
                                        <View style={styles.colDivider} />
                                        <View style={styles.colItem}>
                                            <Text style={styles.colLabel}>Mode</Text>
                                            <Text style={[styles.colValue, { color: theme.textPrimary }]}>{(expense.payment_mode || 'Cash').toUpperCase()}</Text>
                                        </View>
                                    </View>

                                    <View style={[styles.cardFooterRow, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                        <View style={styles.footerLeftGroup}>
                                            <View style={styles.footerMetaItem}>
                                                <Calendar size={13} color="#94A3B8" />
                                                <Text style={styles.footerMetaText}>{formatDate(expense.expense_date)}</Text>
                                            </View>
                                        </View>
                                        {expense.is_wage ? (
                                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#7C3AED' }}>
                                                Staff Wage · manage in Staff
                                            </Text>
                                        ) : (
                                            <View style={styles.cardActions}>
                                                <TouchableOpacity
                                                    style={[styles.actionBtn, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                                                    onPress={() => navigation.navigate('AddExpense', { expense })}
                                                >
                                                    <Edit3 size={12} color="#3B82F6" />
                                                    <Text style={styles.actionBtnTextBlue}>Edit</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.actionBtn, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                                                    onPress={() => handleDelete(expense)}
                                                >
                                                    <Trash2 size={12} color="#EF4444" />
                                                    <Text style={styles.actionBtnTextRed}>Delete</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                    contentContainerStyle={styles.listContentContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setPage(1); setHasMore(true); fetchExpenses(1, true); }} />
                    }
                    onEndReached={() => {
                        if (loadingMore || !hasMore) return;
                        setPage(prev => {
                            const next = prev + 1;
                            fetchExpenses(next);
                            return next;
                        });
                    }}
                    onEndReachedThreshold={0.4}
                    ListEmptyComponent={
                        <EmptyState
                            variant={debouncedSearch ? 'noResults' : 'noData'}
                            title={debouncedSearch ? 'No Results' : 'No Expenses Yet'}
                            subtitle={
                                debouncedSearch
                                    ? `No expenses match "${debouncedSearch}"`
                                    : 'Tap the + button to record your first expense.'
                            }
                            actionLabel={debouncedSearch ? undefined : 'Add Expense'}
                            onAction={debouncedSearch ? undefined : () => navigation.navigate('AddExpense')}
                        />
                    }
                    ListFooterComponent={
                        loadingMore ? (
                            <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 20 }} />
                        ) : !hasMore && expenses.length > 0 ? (
                            <View style={{ alignItems: 'center', marginVertical: 20 }}>
                                <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '600' }}>All expenses loaded</Text>
                            </View>
                        ) : null
                    }
                />
            )}

            {/* Floating Action Button */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.primary }]}
                onPress={() => navigation.navigate('AddExpense')}
                activeOpacity={0.9}
            >
                <Plus color="#FFFFFF" size={28} />
            </TouchableOpacity>

            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                date={currentDate || new Date()}
                maximumDate={new Date()}
                onConfirm={handleConfirmDate}
                onCancel={() => setDatePickerVisibility(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        paddingTop: 55,
        paddingBottom: 30,
        paddingHorizontal: 20,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 12,
        padding: 14,
    },
    statLabel: {
        fontSize: 11,
        color: '#FFFFFF',
        opacity: 0.9,
        marginBottom: 6,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    searchSection: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 16,
        gap: 10,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 44,
        gap: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#1E293B',
        fontWeight: '500',
    },
    monthPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        gap: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    monthText: {
        fontSize: 13,
        color: '#475569',
        fontWeight: '600',
    },
    clearMonthButton: {
        width: 32,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF1F1',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
    },
    premiumCard: {
        borderRadius: 20,
        marginBottom: 12,
        flexDirection: 'row',
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    cardAccentLine: {
        width: 5,
    },
    cardInner: {
        flex: 1,
        padding: 14,
        gap: 12,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardAvatarBg: {
        width: 38, height: 38,
        borderRadius: 19,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 10,
    },
    cardNameBlock: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cardNameText: {
        fontSize: 14,
        fontWeight: '800',
    },
    roomBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    roomBadgeText: {
        fontSize: 9,
        fontWeight: '800',
    },
    cardRightBlock: {
        alignItems: 'flex-end',
    },
    cardAmtText: {
        fontSize: 15,
        fontWeight: '900',
    },
    cardStatusSub: {
        fontSize: 9,
        color: '#94A3B8',
        fontWeight: '600',
        marginTop: 1,
    },
    descriptionText: {
        fontSize: 12,
        lineHeight: 16,
        paddingHorizontal: 4,
    },
    columnsBlock: {
        flexDirection: 'row',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    colItem: {
        flex: 1,
        alignItems: 'center',
    },
    colLabel: {
        fontSize: 8,
        color: '#94A3B8',
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    colValue: {
        fontSize: 12,
        fontWeight: '800',
        marginTop: 2,
    },
    colDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#E2E8F0',
    },
    cardFooterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        paddingTop: 10,
    },
    footerLeftGroup: {
        flexDirection: 'row',
        gap: 12,
    },
    footerMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    footerMetaText: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '700',
    },
    cardActions: {
        flexDirection: 'row',
        gap: 10,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        borderWidth: 1,
    },
    actionBtnTextBlue: {
        fontSize: 10,
        color: '#3B82F6',
        fontWeight: '700',
    },
    actionBtnTextRed: {
        fontSize: 10,
        color: '#EF4444',
        fontWeight: '700',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        color: '#94A3B8',
        fontSize: 16,
        fontWeight: '500',
    },
    bottomSpacing: {
        height: 180,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FF6B6B',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        zIndex: 2000,
    },
    listContentContainer: {
        padding: 16,
        paddingBottom: 180,
    },
    listContentContainer: {
        padding: 16,
        paddingBottom: 180,
    },
});

export default ExpenseScreen;