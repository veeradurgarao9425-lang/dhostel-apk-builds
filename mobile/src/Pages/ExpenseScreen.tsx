import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StatusBar,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Plus, Search, Calendar, ChevronDown, Tag, X } from 'lucide-react-native';
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
    const { theme } = useTheme();
    const [search, setSearch] = useState('');
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentDate, setCurrentDate] = useState<Date | null>(null);
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

    const fetchExpenses = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const response = await api.get('/expenses');
            if (response.data.success) {
                setExpenses(response.data.data);
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
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchExpenses();
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

    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
    
    const currentMonthStr = currentDate
        ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
        : null;

    const filteredMonthExpenses = currentMonthStr
        ? expenses.filter(exp => exp.expense_date?.startsWith(currentMonthStr))
        : expenses;

    const monthExpensesTotal = filteredMonthExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);

    const filteredExpenses = filteredMonthExpenses.filter(exp =>
        exp.vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
        exp.description?.toLowerCase().includes(search.toLowerCase()) ||
        exp.category_name?.toLowerCase().includes(search.toLowerCase()) ||
        exp.bill_number?.toLowerCase().includes(search.toLowerCase())
    );

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
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <LinearGradient
                colors={[theme.gradientStart, theme.gradientEnd]}
                style={[styles.header, { borderBottomLeftRadius: theme.headerRounded, borderBottomRightRadius: theme.headerRounded }]}
            >
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ArrowLeft color="#FFFFFF" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Expenses</Text>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <HeaderNotification navigation={navigation} />
                        <ProfileMenu />
                    </View>
                </View>

                {/* Expense Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Total Expenses</Text>
                        <Text style={styles.statValue}>₹{totalExpenses.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>
                            {currentDate ? getMonthLabel() : 'This Month'}
                        </Text>
                        <Text style={styles.statValue}>₹{monthExpensesTotal.toLocaleString('en-IN')}</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Search Bar */}
            <View style={styles.searchSection}>
                <View style={styles.searchBar}>
                    <Search color="#999999" size={20} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search expenses..."
                        placeholderTextColor="#999999"
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <X color="#999999" size={16} />
                        </TouchableOpacity>
                    )}
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <TouchableOpacity 
                        style={styles.monthPicker}
                        onPress={() => setDatePickerVisibility(true)}
                    >
                        <Calendar color="#666666" size={18} />
                        <Text style={styles.monthText}>{getMonthLabel()}</Text>
                        <ChevronDown color="#666666" size={16} />
                    </TouchableOpacity>
                    {currentDate && (
                        <TouchableOpacity 
                            style={styles.clearMonthButton}
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
                    <ActivityIndicator size="large" color="#FF6B6B" />
                </View>
            ) : (
                <ScrollView 
                    style={styles.content} 
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => fetchExpenses(true)} />
                    }
                >
                    {filteredExpenses.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No expenses found</Text>
                        </View>
                    ) : (
                        filteredExpenses.map((expense) => {
                            const color = getCatColor(expense.category_name);
                            return (
                                <TouchableOpacity
                                    key={expense.expense_id}
                                    style={styles.expenseCard}
                                    onPress={() => navigation.navigate('ExpenseDetails', { expense })}
                                >
                                    <View style={styles.cardInner}>
                                        <View style={styles.leftSection}>
                                            <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                                                <Tag size={20} color={color} />
                                            </View>
                                            <View style={styles.infoContainer}>
                                                <Text style={styles.expenseTitle}>{expense.category_name}</Text>
                                                <Text style={styles.vendorText}>
                                                    {expense.vendor_name || 'Generic Vendor'}
                                                </Text>
                                                <Text style={styles.dateText}>{formatDate(expense.expense_date)}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.rightSection}>
                                            <Text style={styles.amountText}>-₹{parseFloat(expense.amount).toLocaleString('en-IN')}</Text>
                                            <View style={styles.paymentModeBadge}>
                                                <Text style={styles.paymentModeText}>{expense.payment_mode || 'Cash'}</Text>
                                            </View>
                                        </View>
                                    </View>
                                    {expense.description && (
                                        <View style={styles.descriptionContainer}>
                                            <Text style={styles.descriptionText} numberOfLines={2}>
                                                {expense.description}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })
                    )}
                    <View style={styles.bottomSpacing} />
                </ScrollView>
            )}

            {/* Floating Action Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('AddExpense')}
                activeOpacity={0.9}
            >
                <Plus color="#FFFFFF" size={28} />
            </TouchableOpacity>

            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                date={currentDate || new Date()}
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
    expenseCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1,
    },
    cardInner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    expenseTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 2,
    },
    vendorText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
        marginBottom: 2,
    },
    dateText: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
    },
    rightSection: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        marginLeft: 10,
    },
    amountText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#EF4444',
        marginBottom: 4,
    },
    paymentModeBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    paymentModeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
    },
    descriptionContainer: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    descriptionText: {
        fontSize: 12,
        color: '#64748B',
        lineHeight: 16,
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
        height: 120,
    },
    fab: {
        position: 'absolute',
        bottom: 90,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
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
});

export default ExpenseScreen;