import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    TextInput, ActivityIndicator, RefreshControl, StatusBar
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../services/api';
import { AppHeader } from '../components/AppHeader';

export default function AllTransactionsScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { theme } = useTheme();
    const isDark = theme.isDark;

    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<'All' | 'Rent' | 'Admission' | 'Guest' | 'Other'>('All');
    
    // Initial data passed from route params or loaded fresh
    const [transactions, setTransactions] = useState<any[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
    
    // Pagination
    const [visibleCount, setVisibleCount] = useState(15);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Load full transactions for the current period/hostel
            const res = await api.get('/income/analytics', {
                params: { type: 'month', date: new Date().toISOString().slice(0, 10) }
            });
            if (res.data?.success) {
                const txs = res.data.data?.transactions ?? [];
                // Sort by date descending (latest first)
                txs.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setTransactions(txs);
            }
        } catch (err) {
            console.error('Failed to load transaction history', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        // Use transactions from route params if available, otherwise fetch
        if (route.params?.transactions) {
            const txs = [...route.params.transactions].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setTransactions(txs);
        } else {
            loadData();
        }
    }, [route.params?.transactions, loadData]);

    // Apply search and category filtering
    useEffect(() => {
        let result = [...transactions];

        if (selectedCategory !== 'All') {
            result = result.filter(tx => tx.type === selectedCategory);
        }

        if (searchQuery.trim().length > 0) {
            const query = searchQuery.toLowerCase();
            result = result.filter(tx => 
                (tx.title && tx.title.toLowerCase().includes(query)) ||
                (tx.subtitle && tx.subtitle.toLowerCase().includes(query)) ||
                (tx.description && tx.description.toLowerCase().includes(query))
            );
        }

        setFilteredTransactions(result);
        setVisibleCount(15); // Reset pagination on filter change
    }, [transactions, searchQuery, selectedCategory]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleLoadMore = () => {
        if (visibleCount < filteredTransactions.length) {
            setVisibleCount(prev => prev + 15);
        }
    };

    const renderTransactionItem = ({ item, index }: { item: any; index: number }) => {
        let iconBg = '#EDE9FE'; 
        let iconColor = '#7C3AED';
        let iconChar = 'A';
        let targetScreen = 'TenantTransactions';
        let targetParams: any = { studentId: item.student_id, studentName: item.title };

        if (item.type === 'Rent') {
            iconBg = '#DCFCE7'; 
            iconColor = '#15803D';
            iconChar = 'R';
        } else if (item.type === 'Guest') {
            iconBg = '#F3E5F5'; 
            iconColor = '#6B21A8';
            iconChar = 'G';
            targetScreen = 'Guests';
            targetParams = {};
        } else if (item.type === 'Other') {
            iconBg = '#FFEDD5'; 
            iconColor = '#C2410C';
            iconChar = 'O';
            targetScreen = 'Income';
            targetParams = {};
        }

        return (
            <TouchableOpacity
                style={[
                    styles.txCard,
                    {
                        backgroundColor: theme.cardBg,
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                        shadowColor: isDark ? '#000' : '#475569',
                    }
                ]}
                onPress={() => {
                    if (targetScreen === 'TenantTransactions' && !item.student_id) return;
                    navigation.navigate(targetScreen, targetParams);
                }}
                activeOpacity={0.7}
            >
                <View style={[styles.avatarCircle, { backgroundColor: iconBg }]}>
                    <Text style={[styles.avatarText, { color: iconColor }]}>{iconChar}</Text>
                </View>

                <View style={styles.txDetails}>
                    <Text style={[styles.txTitleText, { color: theme.textPrimary }]} numberOfLines={1}>
                        {item.title}
                    </Text>
                    <Text style={[styles.txSubText, { color: theme.textSecondary }]}>
                        {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {item.subtitle || item.type}
                    </Text>
                </View>

                <View style={styles.txRight}>
                    <Text style={[styles.txAmountText, { color: theme.textPrimary }]}>
                        ₹{item.amount.toLocaleString('en-IN')}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                </View>
            </TouchableOpacity>
        );
    };

    const categories: Array<'All' | 'Rent' | 'Admission' | 'Guest' | 'Other'> = ['All', 'Rent', 'Admission', 'Guest', 'Other'];

    return (
        <View style={[styles.container, { backgroundColor: theme.isDark ? '#0F172A' : '#F8FAFC' }]}>
            <StatusBar barStyle="light-content" />
            <AppHeader title="Transaction History" />

            {/* SEARCH AND FILTERS */}
            <View style={[styles.filterBar, { backgroundColor: theme.cardBg, borderBottomColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                <View style={[styles.searchBox, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                    <Ionicons name="search-outline" size={18} color={theme.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                        placeholder="Search by name or description..."
                        placeholderTextColor={theme.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={[styles.searchInput, { color: theme.textPrimary }]}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* CATEGORY CHIPS */}
                <FlatList
                    horizontal
                    data={categories}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryScroll}
                    keyExtractor={(cat) => cat}
                    renderItem={({ item }) => {
                        const active = selectedCategory === item;
                        return (
                            <TouchableOpacity
                                style={[
                                    styles.categoryChip,
                                    active ? { backgroundColor: theme.primary } : { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }
                                ]}
                                onPress={() => setSelectedCategory(item)}
                            >
                                <Text style={[
                                    styles.categoryChipText,
                                    active ? { color: '#FFF' } : { color: theme.textSecondary }
                                ]}>
                                    {item}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>

            {/* TRANSACTION LIST */}
            {loading && transactions.length === 0 ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : filteredTransactions.length > 0 ? (
                <FlatList
                    data={filteredTransactions.slice(0, visibleCount)}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                    renderItem={renderTransactionItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[theme.primary]}
                            tintColor={theme.primary}
                        />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={
                        visibleCount < filteredTransactions.length ? (
                            <View style={{ paddingVertical: 20 }}>
                                <ActivityIndicator size="small" color={theme.primary} />
                            </View>
                        ) : null
                    }
                />
            ) : (
                <View style={styles.center}>
                    <Ionicons name="receipt-outline" size={48} color={theme.textSecondary} />
                    <Text style={{ marginTop: 12, color: theme.textSecondary, fontWeight: '600', fontSize: 15 }}>No transactions found</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    filterBar: {
        paddingTop: 14,
        paddingBottom: 10,
        borderBottomWidth: 1,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        paddingHorizontal: 12,
        borderRadius: 12,
        height: 44,
        marginBottom: 10,
    },
    searchInput: { flex: 1, fontSize: 14, height: '100%', padding: 0 },
    categoryScroll: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    categoryChipText: { fontSize: 13, fontWeight: '700' },
    listContent: { padding: 16, paddingBottom: 40, gap: 10 },
    txCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    avatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { fontSize: 16, fontWeight: '800' },
    txDetails: { flex: 1, marginLeft: 12 },
    txTitleText: { fontSize: 14, fontWeight: '800' },
    txSubText: { fontSize: 11, marginTop: 4, fontWeight: '600' },
    txRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    txAmountText: { fontSize: 15, fontWeight: '900' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }
});
