import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
    StatusBar, ActivityIndicator, Linking, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import api from '../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { SkeletonList } from '../components/ui/SkeletonCard';

const sf = (v: any): number => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

export default function BillRemindersScreen() {
    const navigation = useNavigation<any>();
    const { theme } = useTheme();

    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'Due' | 'Overdue'>('Due');

    // ── Fetch outstanding bills ──────────────────────────────────────────────
    const fetchBills = async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);
            setError(false);
            const res = await api.get('/monthly-fees/summary');
            if (res.data.success) {
                const fees: any[] = res.data.data?.fees || [];
                const now = new Date();
                now.setHours(0, 0, 0, 0);

                const PAID_SET = new Set(['paid', 'fully paid', 'cleared']);
                
                // Filter only pending/partially paid fees with outstanding balances
                const unpaid = fees
                    .filter(f => {
                        const status = (f.fee_status || '').toLowerCase();
                        const total = sf(f.total_amount || f.total_due || f.monthly_rent || 0);
                        const paid = sf(f.amount_paid || f.paid_amount || 0);
                        const due = total - paid;
                        return due > 0 && !PAID_SET.has(status);
                    })
                    .map(f => {
                        const total = sf(f.total_amount || f.total_due || f.monthly_rent || 0);
                        const paid = sf(f.amount_paid || f.paid_amount || 0);
                        const due = total - paid;
                        const dueDateObj = f.due_date ? new Date(f.due_date) : new Date();
                        const isOverdue = dueDateObj.getTime() < now.getTime();

                        // Format due date to DD-MM-YYYY
                        const formattedDueDate = f.due_date 
                            ? f.due_date.split('T')[0].split('-').reverse().join('-') 
                            : now.toLocaleDateString('en-IN');

                        return {
                            id: f.student_id,
                            name: `${f.first_name || ''} ${f.last_name || ''}`.trim(),
                            phone: f.phone || '',
                            room: f.room_number || 'N/A',
                            dueAmount: due,
                            dueDate: formattedDueDate,
                            isOverdue,
                            feeMonth: f.fee_month || f.month || '',
                        };
                    });

                setTenants(unpaid);
            }
        } catch (e) {
            console.error('Error fetching bill reminders:', e);
            setError(true);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load outstanding bills' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchBills();
        }, [])
    );

    // ── Search filtering & Tabs ─────────────────────────────────────────────────────
    const dueCount = tenants.filter(t => !t.isOverdue).length;
    const overdueCount = tenants.filter(t => t.isOverdue).length;

    const filteredTenants = useMemo(() => {
        const q = search.toLowerCase().trim();
        return tenants.filter(t => {
            const matchesTab = activeTab === 'Overdue' ? t.isOverdue : !t.isOverdue;
            const matchesSearch = t.name.toLowerCase().includes(q) || t.room.toLowerCase().includes(q);
            return matchesTab && matchesSearch;
        });
    }, [tenants, search, activeTab]);

    // ── WhatsApp reminder trigger ────────────────────────────────────────────
    const sendWhatsAppReminder = (tenant: any) => {
        if (!tenant.phone) {
            Toast.show({ type: 'error', text1: 'Phone number missing' });
            return;
        }
        const msg = `Hi ${tenant.name}, this is a reminder that your dues of ₹${tenant.dueAmount.toLocaleString('en-IN')} for ${tenant.feeMonth} is pending. Due date: ${tenant.dueDate}. Please clear it as soon as possible. Thank you! 🏠`;
        Linking.openURL(`whatsapp://send?phone=91${tenant.phone}&text=${encodeURIComponent(msg)}`);
    };

    // ── Render Card ─────────────────────────────────────────────────────────
    const renderCard = ({ item }: any) => {
        return (
            <View style={s.card}>
                <View style={s.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.tenantName}>{item.name}</Text>
                        <View style={s.roomRow}>
                            <Ionicons name="business-outline" size={14} color="#94A3B8" />
                            <Text style={s.roomText}>Room {item.room}</Text>
                        </View>
                    </View>
                    <View style={s.rightActions}>
                        <View style={s.amountPill}>
                            <Text style={s.amountPillText}>₹{item.dueAmount.toLocaleString('en-IN')}</Text>
                        </View>
                        <TouchableOpacity 
                            style={s.whatsappCircle}
                            onPress={() => sendWhatsAppReminder(item)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={s.divider} />

                {/* Date Row */}
                <View style={s.detailsRow}>
                    <View style={s.detailCol}>
                        <Text style={s.detailLabel}>Due Date</Text>
                        <View style={s.detailValRow}>
                            <Ionicons name="alert-circle-outline" size={13} color="#EF4444" />
                            <Text style={s.dueDateVal}>{item.dueDate}</Text>
                        </View>
                    </View>
                    <View style={s.detailCol}>
                        <Text style={s.detailLabel}>Outstanding</Text>
                        <View style={s.detailValRow}>
                            <Ionicons name="warning-outline" size={13} color="#F59E0B" />
                            <Text style={s.outstandingVal}>₹{item.dueAmount.toLocaleString('en-IN')}</Text>
                        </View>
                    </View>
                </View>

                {/* Overdue alert banner */}
                <View style={[s.alertBanner, item.isOverdue ? s.overdueBg : s.upcomingBg]}>
                    <Ionicons 
                        name={item.isOverdue ? "time-outline" : "checkmark-circle-outline"} 
                        size={14} 
                        color={item.isOverdue ? "#DC2626" : "#4B5563"} 
                    />
                    <Text style={[s.alertText, { color: item.isOverdue ? "#DC2626" : "#4B5563" }]}>
                        {item.isOverdue ? 'Payment overdue' : 'Due soon'}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={s.container}>
            <StatusBar barStyle="light-content" />

            {/* Header Layout */}
            <AppHeader
                title="Bill Reminders"
                subtitle={`${filteredTenants.length} total tenant${filteredTenants.length !== 1 ? 's' : ''}`}
            />

            {/* Search inputs */}
            <View style={s.searchWrap}>
                <Ionicons name="search" size={18} color="#94A3B8" />
                <TextInput
                    style={s.searchInput}
                    placeholder="Search by name or room..."
                    placeholderTextColor="#94A3B8"
                    value={search}
                    onChangeText={setSearch}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <Ionicons name="close-circle" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Tabs */}
            <View style={s.tabsContainer}>
                <TouchableOpacity 
                    style={[s.tabButton, activeTab === 'Due' && s.tabButtonActive]}
                    onPress={() => setActiveTab('Due')}
                    activeOpacity={0.8}
                >
                    <Text style={[s.tabText, activeTab === 'Due' && s.tabTextActive]}>Due</Text>
                    <View style={[s.tabBadge, activeTab === 'Due' && s.tabBadgeActive]}>
                        <Text style={[s.tabBadgeText, activeTab === 'Due' && s.tabBadgeTextActive]}>{dueCount}</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[s.tabButton, activeTab === 'Overdue' && s.tabButtonActive, activeTab === 'Overdue' && { backgroundColor: '#FEE2E2', borderColor: '#FEE2E2' }]}
                    onPress={() => setActiveTab('Overdue')}
                    activeOpacity={0.8}
                >
                    <Text style={[s.tabText, activeTab === 'Overdue' && { color: '#DC2626' }]}>Overdue</Text>
                    <View style={[s.tabBadge, activeTab === 'Overdue' && { backgroundColor: '#DC2626' }]}>
                        <Text style={[s.tabBadgeText, activeTab === 'Overdue' && { color: '#FFFFFF' }]}>{overdueCount}</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Tip Banner */}
            <View style={s.tipBanner}>
                <Ionicons name="information-circle-outline" size={16} color="#16A34A" />
                <Text style={s.tipText}>Tap WhatsApp icon to send bill reminder instantly.</Text>
            </View>

            <FlatList
                data={filteredTenants}
                keyExtractor={(item) => `bill-${item.id}`}
                renderItem={renderCard}
                contentContainerStyle={s.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchBills(true); }}
                        tintColor={theme.primary}
                    />
                }
                ListEmptyComponent={
                    loading ? (
                        <SkeletonList count={4} />
                    ) : error ? (
                        <ErrorState onRetry={() => fetchBills(true)} />
                    ) : (
                        <EmptyState
                            illustration="clipboard"
                            title={activeTab === 'Overdue' ? 'No Overdue Bills 🎉' : 'No Bills Due 🎉'}
                            subtitle={activeTab === 'Overdue' ? 'Great! No one has overdue payments.' : 'All dues are cleared.'}
                        />
                    )
                }
                ListFooterComponent={
                    (!loading && !error && filteredTenants.length > 0) ? (
                        <View style={s.footer}>
                            <Text style={s.footerText}>Powered by Hostix • Durgarao</Text>
                            <Text style={s.footerTextCopy}>© 2026 All Rights Reserved.</Text>
                        </View>
                    ) : null
                }
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },

    header: { paddingTop: 50, paddingBottom: 25, paddingHorizontal: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    backCircle: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: '#FFF',
        alignItems: 'center', justifyContent: 'center',
        elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3,
    },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#FFF' },
    headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 1 },

    searchWrap: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFF', borderRadius: 14,
        marginHorizontal: 16, marginTop: 16, paddingHorizontal: 12, paddingVertical: 10,
        elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4,
        borderWidth: 1, borderColor: '#F1F5F9',
    },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 13, color: '#1E293B', fontWeight: '600' },

    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginTop: 12,
        gap: 8,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        gap: 6,
    },
    tabButtonActive: {
        backgroundColor: '#F3E8FF',
        borderColor: '#9333EA',
    },
    tabText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
    tabTextActive: { color: '#9333EA' },
    tabBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    tabBadgeActive: {
        backgroundColor: '#9333EA',
    },
    tabBadgeText: { fontSize: 11, fontWeight: '800', color: '#94A3B8' },
    tabBadgeTextActive: { color: '#FFFFFF' },

    tipBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#C8E6C9',
        borderRadius: 10, marginHorizontal: 16, marginTop: 12, padding: 10,
    },
    tipText: { fontSize: 11, fontWeight: '700', color: '#16A34A' },

    listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 60 },

    card: {
        backgroundColor: '#FFF', borderRadius: 18,
        marginBottom: 12, overflow: 'hidden',
        borderWidth: 1, borderColor: '#F1F5F9',
        elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
    tenantName: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
    roomRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    roomText: { fontSize: 11, color: '#94A3B8', fontWeight: '700' },
    
    rightActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    amountPill: {
        backgroundColor: '#2563EB', borderRadius: 8,
        paddingHorizontal: 10, paddingVertical: 5,
    },
    amountPillText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
    whatsappCircle: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: '#E8F5E9',
        alignItems: 'center', justifyContent: 'center',
    },

    divider: { height: 1, backgroundColor: '#F1F5F9' },

    detailsRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10 },
    detailCol: { flex: 1 },
    detailLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '700', marginBottom: 4 },
    detailValRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dueDateVal: { fontSize: 12, fontWeight: '800', color: '#EF4444' },
    outstandingVal: { fontSize: 12, fontWeight: '800', color: '#F59E0B' },

    alertBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 8,
    },
    overdueBg: { backgroundColor: '#FEE2E2' },
    upcomingBg: { backgroundColor: '#F3F4F6' },
    alertText: { fontSize: 11, fontWeight: '700' },

    emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { fontSize: 14, color: '#94A3B8', fontWeight: '700' },

    footer: { alignItems: 'center', justifyContent: 'center', marginTop: 40, marginBottom: 20 },
    footerText: { fontSize: 12, fontWeight: '800', color: '#1E293B', marginBottom: 2 },
    footerTextCopy: { fontSize: 10, color: '#94A3B8', fontWeight: '600' }
});
