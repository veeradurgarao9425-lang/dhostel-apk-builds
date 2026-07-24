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
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Plus, Search, Calendar, ChevronDown, Tag, X, Edit3, Trash2 } from 'lucide-react-native';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { SkeletonList } from '../components/ui/SkeletonCard';
import { DangerModal } from '../components/ui/DangerModal';
import { LoadMoreFooter } from '../components/ui/LoadMoreFooter';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { ProfileMenu } from '../components/ProfileMenu';
import { useTheme } from '../../contexts/ThemeContext';
import { HeaderNotification } from '../components/HeaderNotification';
import DateTimePickerModal from "react-native-modal-datetime-picker";

const CAT_COLORS: Record<string, string> = {
    'Electricity': '#F59E0B',
    'Electricity Bill': '#F59E0B',
    'Water': '#0EA5E9',
    'Water Bill': '#0EA5E9',
    'Lift Bill': '#6366F1',
    'Maintenance': '#8B5CF6',
    'Salary': '#10B981',
    'Groceries': '#F97316',
    'Internet': '#06B6D4',
    'Internet Bill': '#06B6D4',
    'Cleaning': '#EC4899',
    'Other': '#64748B',
    'Others': '#64748B',
    'Others Bill': '#64748B',
    'Miscellaneous': '#64748B',
};

const getCatColor = (name: string) => CAT_COLORS[name] || '#64748B';

export const ExpenseScreen = ({ navigation }: any) => {
    const { user } = useAuth();
    const { theme, isDark } = useTheme();
    const { showApiError, showSuccess, showToast } = useToast();
    const [dangerModal, setDangerModal] = useState<{ visible: boolean; expense: any | null }>({
        visible: false, expense: null,
    });
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [currentDate, setCurrentDate] = useState<Date | null>(null);
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [backgroundLoading, setBackgroundLoading] = useState(false);

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
                if (!isSilent) {
                    setLoading(true);
                } else if (expenses.length > 0) {
                    setBackgroundLoading(true);
                }
                setError(false);
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
            showApiError(error, 'Failed to fetch expenses');
            if (pageNum === 1) setError(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
            setBackgroundLoading(false);
        }
    };

    const handleDelete = (expense: any) => {
        setDangerModal({ visible: true, expense });
    };

    const handleDeleteConfirm = async () => {
        const { expense } = dangerModal;
        setDangerModal(p => ({ ...p, visible: false }));
        if (!expense) return;
        try {
            const response = await api.delete(`/expenses/${expense.expense_id}`);
            if (response.data.success) {
                showSuccess('Expense deleted successfully.');
                fetchExpenses(1, true);
            } else {
                showToast({ type: 'error', message: response.data.message || 'Failed to delete expense' });
            }
        } catch (error) {
            showApiError(error, 'Failed to delete expense');
        }
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
                alignLeft
                subtitle="Manage your daily hostel expenses"
            />

            {/* Expense Stats */}
            <View style={styles.statsRow}>
                <View style={[
                    styles.statCard,
                    {
                        backgroundColor: isDark ? '#1e1b4b' : '#EEF2FF',
                        borderColor: isDark ? '#312E81' : '#E0E7FF'
                    }
                ]}>
                    <View style={[styles.statIconWrap, { backgroundColor: isDark ? '#312E81' : '#E0E7FF' }]}>
                        <Ionicons name="wallet-outline" size={15} color={isDark ? '#C7D2FE' : '#4F46E5'} />
                    </View>
                    <Text style={[styles.statLabel, { color: isDark ? '#C7D2FE' : '#4F46E5' }]}>Total Expenses</Text>
                    <Text style={[styles.statValue, { color: isDark ? '#E0E7FF' : '#312E81' }]}>₹{totalExpenses.toLocaleString('en-IN')}</Text>
                </View>
                <View style={[
                    styles.statCard,
                    {
                        backgroundColor: isDark ? '#2D1919' : '#FFF1F1',
                        borderColor: isDark ? '#7F1D1D' : '#FEE2E2'
                    }
                ]}>
                    <View style={[styles.statIconWrap, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' }]}>
                        <Ionicons name="calendar-outline" size={15} color={isDark ? '#FCA5A5' : '#EF4444'} />
                    </View>
                    <Text style={[styles.statLabel, { color: isDark ? '#FCA5A5' : '#EF4444' }]}>
                        {currentDate ? getMonthLabel() : 'This Month'}
                    </Text>
                    <Text style={[styles.statValue, { color: isDark ? '#FEE2E2' : '#991B1B' }]}>₹{monthExpensesTotal.toLocaleString('en-IN')}</Text>
                </View>
            </View>

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
                        <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7} style={{ padding: 4 }}>
                            <X color={isDark ? '#94A3B8' : "#999999"} size={16} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            
            {/* Quick Filters */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    <TouchableOpacity
                        style={[
                            styles.filterChip, 
                            !currentDate ? { backgroundColor: theme.primary, borderColor: theme.primary } : { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }
                        ]}
                        onPress={() => setCurrentDate(null)}
                    >
                        <Text style={[styles.filterChipText, !currentDate ? { color: '#FFFFFF' } : { color: theme.textSecondary }]}>All Time</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[
                            styles.filterChip, 
                            currentDate && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear() 
                                ? { backgroundColor: theme.primary, borderColor: theme.primary } 
                                : { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }
                        ]}
                        onPress={() => setCurrentDate(new Date())}
                    >
                        <Text style={[styles.filterChipText, currentDate && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear() ? { color: '#FFFFFF' } : { color: theme.textSecondary }]}>This Month</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[
                            styles.filterChip, 
                            currentDate && currentDate.getMonth() === (new Date().getMonth() === 0 ? 11 : new Date().getMonth() - 1) && currentDate.getFullYear() === (new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear())
                                ? { backgroundColor: theme.primary, borderColor: theme.primary } 
                                : { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }
                        ]}
                        onPress={() => {
                            const d = new Date();
                            d.setMonth(d.getMonth() - 1);
                            setCurrentDate(d);
                        }}
                    >
                        <Text style={[styles.filterChipText, currentDate && currentDate.getMonth() === (new Date().getMonth() === 0 ? 11 : new Date().getMonth() - 1) && currentDate.getFullYear() === (new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear()) ? { color: '#FFFFFF' } : { color: theme.textSecondary }]}>Last Month</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.filterChip,
                            { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0', flexDirection: 'row', alignItems: 'center', gap: 4 }
                        ]}
                        onPress={() => setDatePickerVisibility(true)}
                    >
                        <Calendar size={14} color={theme.textSecondary} />
                        <Text style={[styles.filterChipText, { color: theme.textSecondary }]}>Custom Month</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {loading ? (
                <SkeletonList count={5} />
            ) : error && expenses.length === 0 ? (
                <ErrorState onRetry={() => fetchExpenses(1, false)} />
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
                                        showToast({ type: 'info', message: 'Manage this from Staff → Payments.' });
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

                                    <View style={[styles.cardFooterRow, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                        <View style={styles.footerLeftGroup}>
                                            <View style={styles.footerMetaItem}>
                                                <Calendar size={13} color="#94A3B8" />
                                                <Text style={styles.footerMetaText}>{formatDate(expense.expense_date)}</Text>
                                            </View>
                                            <View style={styles.footerMetaItem}>
                                                <Ionicons name="wallet-outline" size={13} color="#94A3B8" />
                                                <Text style={styles.footerMetaText}>{(expense.payment_mode || 'Cash').toUpperCase()}</Text>
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
                                                    activeOpacity={0.7}
                                                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                                >
                                                    <Edit3 size={12} color="#3B82F6" />
                                                    <Text style={styles.actionBtnTextBlue}>Edit</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.actionBtn, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                                                    onPress={() => handleDelete(expense)}
                                                    activeOpacity={0.7}
                                                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
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
                    contentContainerStyle={[
                        styles.listContentContainer,
                        expenses.length === 0 && { flexGrow: 1, justifyContent: 'center' }
                    ]}
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
                        <EmptyState illustration="expense"
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
                        <LoadMoreFooter loading={loadingMore} hasMore={hasMore} total={expenses.length} noun="expenses" />
                    }
                />
            )}

            {/* Floating Action Button */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.primary }]}
                onPress={() => navigation.navigate('AddExpense')}
                activeOpacity={0.9}
            >
                <Plus color="#FFFFFF" size={22} strokeWidth={3.2} />
            </TouchableOpacity>

            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                date={currentDate || new Date()}
                maximumDate={new Date()}
                onConfirm={handleConfirmDate}
                onCancel={() => setDatePickerVisibility(false)}
            />

            <DangerModal
                visible={dangerModal.visible}
                title="Delete Expense?"
                message={`Delete this ₹${parseFloat(dangerModal.expense?.amount || 0).toLocaleString('en-IN')} expense? This cannot be undone.`}
                confirmText="Delete"
                onCancel={() => setDangerModal(p => ({ ...p, visible: false }))}
                onConfirm={handleDeleteConfirm}
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
        paddingHorizontal: 16,
        paddingTop: 14,
    },
    statCard: {
        flex: 1,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 3,
    },
    statIconWrap: {
        width: 26,
        height: 26,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 19,
        fontWeight: '900',
    },
    searchSection: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 12,
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
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
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
        fontSize: 13,
        fontWeight: '700',
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
        fontSize: 17,
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
        bottom: 45,
        right: 24,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#FF6B6B',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
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
});

export default ExpenseScreen;