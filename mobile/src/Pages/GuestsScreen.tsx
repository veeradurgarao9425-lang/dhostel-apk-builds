import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
    StatusBar, RefreshControl, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Plus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { toLocalDateStr } from '../utils/dateUtils';
import api from '../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../context/ToastContext';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { SkeletonList } from '../components/ui/SkeletonCard';
import { StatCard } from '../components/ui/StatCard';
import { ModalSheet } from '../components/FormComponents';


const MiniStatCard = ({ title, value, icon, color }: any) => {
    return (
        <View style={{ flex: 1, backgroundColor: color + '10', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: color + '25', elevation: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <View style={{ backgroundColor: color + '20', padding: 4, borderRadius: 6 }}>
                    <Ionicons name={icon} size={14} color={color} />
                </View>
                <Text style={{ fontSize: 10, fontWeight: '700', color: color, flex: 1, opacity: 0.8 }} numberOfLines={1}>{title}</Text>
            </View>
            <Text style={{ fontSize: 17, fontWeight: '900', color: color }}>{value}</Text>
        </View>
    );
};
import { DangerModal } from '../components/ui/DangerModal';

const fmtDate = (d?: string) => {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return d;
    }
};

export default function GuestsScreen() {
    const navigation = useNavigation<any>();
    const { theme, isDark } = useTheme();

    const [guests, setGuests] = useState<any[]>([]);
    const [summary, setSummary] = useState<{ count: number; totalCollected: number }>({ count: 0, totalCollected: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [dateFilter, setDateFilter] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'All' | 'staying' | 'checked_out'>('All');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const isMounted = useRef(false);
    const { showApiError, showSuccess } = useToast();

    // DangerModal state
    const [dangerModal, setDangerModal] = useState<{ visible: boolean; guest: any | null; mode: 'checkout' | 'delete' }>({
        visible: false, guest: null, mode: 'delete'
    });

    // Auto-bill checkout sheet state
    const [checkoutSheet, setCheckoutSheet] = useState<{ visible: boolean; guest: any | null; totalBill: number; finalAmount: string }>({
        visible: false, guest: null, totalBill: 0, finalAmount: ''
    });
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    const fetchGuests = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            setError(false);
            const params: Record<string, any> = {};
            if (dateFilter) {
                params.date = toLocalDateStr(new Date(dateFilter));
            }
            const res = await api.get('/guests', { params });
            if (res.data?.success) {
                setGuests(res.data.data || []);
                setSummary(res.data.summary || { count: 0, totalCollected: 0 });
            }
        } catch (e) {
            setError(true);
            if (!silent) showApiError(e, 'Failed to load guests');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [dateFilter]);

    // Focus listener for screen returns (e.g. after adding a guest)
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (!isMounted.current) {
                isMounted.current = true;
                return;
            }
            fetchGuests(true);
        });
        return unsubscribe;
    }, [navigation, fetchGuests]);

    // Fetch when dateFilter changes (and on initial mount)
    useEffect(() => {
        fetchGuests(false);
    }, [dateFilter, fetchGuests]);

    const handleCheckout = (guest: any) => {
        // Compute auto bill preview: days × per_day_amount
        const days = Number(guest.days) || 1;
        const perDay = Number(guest.per_day_amount) || 0;
        const totalBill = days * perDay;
        setCheckoutSheet({ visible: true, guest, totalBill, finalAmount: totalBill.toString() });
    };

    const handleDelete = (guest: any) => {
        setDangerModal({ visible: true, guest, mode: 'delete' });
    };

    const handleConfirmCheckout = async () => {
        if (!checkoutSheet.guest) return;
        setCheckoutLoading(true);
        try {
            const res = await api.post(`/guests/${checkoutSheet.guest.guest_id}/checkout`, {
                final_amount: parseFloat(checkoutSheet.finalAmount) || 0,
                checked_out_at: new Date().toISOString().split('T')[0],
            });
            if (res.data?.success) {
                showSuccess(
                    `Guest checked out. Collected: ₹${Number(checkoutSheet.finalAmount || 0).toLocaleString('en-IN')}`,
                    'Checkout Complete'
                );
                setCheckoutSheet(p => ({ ...p, visible: false }));
                fetchGuests(true);
            }
        } catch (e) {
            showApiError(e, 'Failed to check out guest');
        } finally {
            setCheckoutLoading(false);
        }
    };

    const handleDangerConfirm = async () => {
        const { guest, mode } = dangerModal;
        setDangerModal(p => ({ ...p, visible: false }));
        if (!guest) return;
        try {
            if (mode === 'delete') {
                await api.delete(`/guests/${guest.guest_id}`);
                showSuccess('Guest record deleted.');
            }
            fetchGuests(true);
        } catch (e) {
            showApiError(e, 'Failed to delete guest');
        }
    };

    const filteredBySearch = search.trim()
        ? guests.filter(g =>
            (g.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (g.phone || '').includes(search) ||
            (g.purpose || '').toLowerCase().includes(search.toLowerCase()))
        : guests;

    const filtered = filteredBySearch.filter(g => {
        if (activeTab === 'All') return true;
        return g.status === activeTab;
    });

    const renderItem = ({ item }: any) => (
        <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => navigation.navigate('AddGuest', { guest: item, isEdit: true })}
            style={[s.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}
        >
            <View style={s.cardTop}>
                <View style={[s.avatar, { backgroundColor: isDark ? '#334155' : '#EDE9FE' }]}>
                    <Text style={[s.avatarText, { color: theme.primary }]}>
                        {(item.full_name || 'G')[0].toUpperCase()}
                    </Text>
                </View>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={[s.name, { color: theme.textPrimary }]} numberOfLines={1}>{item.full_name}</Text>
                        {item.is_overstay && (
                            <View style={s.overstayBadge}>
                                <Text style={s.overstayText}>OVERSTAY</Text>
                            </View>
                        )}
                        {item.status === 'checked_out' && (
                            <View style={s.checkedOutBadge}>
                                <Text style={s.checkedOutText}>CHECKED OUT</Text>
                            </View>
                        )}
                    </View>
                    {!!item.phone && <Text style={[s.sub, { color: theme.textSecondary }]}>{item.phone}</Text>}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={s.amountBadge}>
                        <Text style={s.amountText}>₹{Number(item.amount_paid || 0).toLocaleString('en-IN')}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="trash-outline" size={18} color="#DC2626" />
                    </TouchableOpacity>
                </View>
            </View>

            {!!item.purpose && <Text style={[s.purpose, { color: theme.textSecondary }]}>{item.purpose}</Text>}

            <View style={[s.metaRow, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                <View style={s.metaItem}>
                    <Ionicons name="log-in-outline" size={13} color="#16A34A" />
                    <Text style={[s.metaText, { color: theme.textSecondary }]}>{fmtDate(item.check_in_date)}</Text>
                </View>
                {!!item.room_number && (
                    <View style={s.metaItem}>
                        <Ionicons name="bed-outline" size={13} color="#2563EB" />
                        <Text style={[s.metaText, { color: theme.textSecondary }]}>Room {item.room_number}</Text>
                    </View>
                )}
                <View style={s.metaItem}>
                    <Ionicons name="moon-outline" size={13} color={theme.primary} />
                    <Text style={[s.metaText, { color: theme.textSecondary }]}>
                        {Number(item.days || 1) === 1 ? '1 day' : `${item.days || 1} days`}
                    </Text>
                </View>
                <View style={{ flex: 1 }} />
                {item.status === 'staying' && (
                <View style={s.cardActions}>
                    <TouchableOpacity 
                        style={[s.btn, { backgroundColor: isDark ? theme.primary + '20' : '#E0E7FF' }]} 
                        onPress={() => handleCheckout(item)}
                    >
                        <Ionicons name="log-out-outline" size={16} color={theme.primary} />
                        <Text style={[s.btnText, { color: theme.primary }]}>Check Out</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    </TouchableOpacity>
    );

    return (
        <View style={[s.root, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" />
            <AppHeader alignLeft={true} title="Guests" subtitle="Short-stay & daily visitors">
                <View style={s.searchWrap}>
                    <Ionicons name="search" size={18} color="#94A3B8" />
                    <TextInput
                        style={s.searchInput}
                        placeholder="Search guests..."
                        placeholderTextColor="#94A3B8"
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')} style={{ marginRight: 4 }}>
                            <Ionicons name="close-circle" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    )}
                    <View style={{ width: 1, height: 20, backgroundColor: '#E2E8F0', marginHorizontal: 6 }} />
                    <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.7} style={{ padding: 4 }}>
                        <Ionicons name="calendar" size={18} color={dateFilter ? theme.primary : '#94A3B8'} />
                    </TouchableOpacity>
                    {dateFilter && (
                        <TouchableOpacity onPress={() => setDateFilter(null)} style={{ marginLeft: 4, padding: 4 }}>
                            <Ionicons name="close-circle" size={18} color="#DC2626" />
                        </TouchableOpacity>
                    )}
                </View>
            </AppHeader>

            {/* Summary strip */}
            <View style={s.summaryContainer}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <MiniStatCard 
                        title="Total Guests" 
                        value={summary.count} 
                        icon="people-outline" 
                        color="#7C3AED" 
                    />
                    <MiniStatCard 
                        title="Collected Fees" 
                        value={`₹${summary.totalCollected.toLocaleString('en-IN')}`} 
                        icon="cash-outline" 
                        color="#10B981" 
                    />
                    {filtered.filter(g => g.status === 'staying').length > 0 && (
                        <MiniStatCard 
                            title="Active Guests" 
                            value={filtered.filter(g => g.status === 'staying').length} 
                            icon="log-in-outline" 
                            color="#F59E0B" 
                        />
                    )}
                </View>
            </View>

            {/* Tabs */}
            <View style={{ paddingHorizontal: 16, marginBottom: 0 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {['All', 'staying', 'checked_out'].map(tab => {
                        const isSel = activeTab === tab;
                        const label = tab === 'staying' ? 'Checked In' : tab === 'checked_out' ? 'Checked Out' : 'All';
                        const count = guests.filter(g => tab === 'All' ? true : g.status === tab).length;
                        return (
                            <TouchableOpacity
                                key={tab}
                                onPress={() => setActiveTab(tab as any)}
                                style={{
                                    paddingHorizontal: 14,
                                    paddingVertical: 7,
                                    borderRadius: 20,
                                    borderWidth: 1.5,
                                    borderColor: isSel ? theme.primary : (isDark ? '#334155' : '#E2E8F0'),
                                    backgroundColor: isSel ? theme.primary : (isDark ? '#1E293B' : '#FFF'),
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                                activeOpacity={0.75}
                            >
                                <Text style={{
                                    fontSize: 13,
                                    fontWeight: '700',
                                    color: isSel ? '#FFF' : theme.textSecondary,
                                }}>{label}</Text>
                                <View style={{ backgroundColor: isSel ? '#FFF' : (isDark ? '#334155' : '#F1F5F9'), paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: isSel ? theme.primary : theme.textSecondary }}>{count}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {loading ? (
                <SkeletonList count={5} />
            ) : error ? (
                <ErrorState onRetry={() => fetchGuests(false)} />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => String(item.guest_id)}
                    renderItem={renderItem}
                    contentContainerStyle={[
                        { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 },
                        filtered.length === 0 && { flex: 1 }
                    ]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchGuests(true); }} tintColor={theme.primary} />
                    }
                    ListEmptyComponent={
                        <EmptyState illustration="guest"
                            title={search.trim() ? 'No Results' : 'No Guests Yet'}
                            subtitle={
                                search.trim()
                                    ? `No guests match "${search.trim()}"`
                                    : 'Record short-stay guests who pay for a day or two.'
                            }
                            actionLabel={search.trim() ? undefined : 'Add Guest'}
                            onAction={search.trim() ? undefined : () => navigation.navigate('AddGuest')}
                        />
                    }
                />
            )}

            <TouchableOpacity
                style={[s.fab, { backgroundColor: theme.primary }]}
                onPress={() => navigation.navigate('AddGuest')}
                activeOpacity={0.85}
            >
                <Plus color="#FFF" size={26} strokeWidth={3.5} />
            </TouchableOpacity>

            <DateTimePickerModal
                isVisible={showDatePicker}
                mode="date"
                date={dateFilter ? new Date(dateFilter) : new Date()}
                onConfirm={(d: Date) => { setDateFilter(d.toISOString()); setShowDatePicker(false); }}
                onCancel={() => setShowDatePicker(false)}
            />

            <DangerModal
                visible={dangerModal.visible}
                title={'Delete Guest?'}
                message={`Remove ${dangerModal.guest?.full_name || 'this guest'}'s record? This cannot be undone.`}
                confirmText={'Delete'}
                onCancel={() => setDangerModal(p => ({ ...p, visible: false }))}
                onConfirm={handleDangerConfirm}
            />

            {/* ── Auto-Bill Checkout Sheet ── */}
            <ModalSheet
                visible={checkoutSheet.visible}
                onClose={() => setCheckoutSheet(p => ({ ...p, visible: false }))}
                maxHeight="55%"
            >
                <View style={{ padding: 20, gap: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="log-out-outline" size={22} color="#D97706" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1F2937' }}>
                                Check Out — {checkoutSheet.guest?.full_name || 'Guest'}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                                {Number(checkoutSheet.guest?.days) || 1} day(s) × ₹{Number(checkoutSheet.guest?.per_day_amount) || 0}/day
                            </Text>
                        </View>
                    </View>

                    {/* Bill Summary */}
                    <View style={{ backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#BBF7D0', gap: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 13, color: '#374151' }}>Computed Bill</Text>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#059669' }}>₹{checkoutSheet.totalBill.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={{ height: 1, backgroundColor: '#BBF7D0' }} />
                        <Text style={{ fontSize: 11, color: '#6B7280' }}>
                            💡 You can adjust the amount below if there are additional charges or discounts.
                        </Text>
                    </View>

                    {/* Editable final amount */}
                    <View>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6 }}>Final Amount to Collect (₹)</Text>
                        <TextInput
                            style={{
                                borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10,
                                paddingHorizontal: 14, paddingVertical: 10,
                                fontSize: 18, fontWeight: '800', color: '#1F2937',
                                backgroundColor: '#FFF',
                            }}
                            keyboardType="numeric"
                            value={checkoutSheet.finalAmount}
                            onChangeText={(v) => setCheckoutSheet(p => ({ ...p, finalAmount: v.replace(/[^0-9.]/g, '') }))}
                            placeholder="0"
                        />
                    </View>

                    {/* Action Buttons */}
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                            style={{ flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' }}
                            onPress={() => setCheckoutSheet(p => ({ ...p, visible: false }))}
                            activeOpacity={0.8}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{ flex: 2, paddingVertical: 13, borderRadius: 12, backgroundColor: '#059669', alignItems: 'center', opacity: checkoutLoading ? 0.7 : 1 }}
                            onPress={handleConfirmCheckout}
                            disabled={checkoutLoading}
                            activeOpacity={0.85}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFF' }}>
                                {checkoutLoading ? 'Processing...' : `Checkout & Collect ₹${Number(checkoutSheet.finalAmount || 0).toLocaleString('en-IN')}`}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ModalSheet>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1 },
    searchWrap: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
        borderRadius: 12, paddingHorizontal: 12, height: 44, gap: 8, marginBottom: 4,
    },
    searchInput: { flex: 1, color: '#1E293B', fontWeight: '600' },
    summaryContainer: {
        marginTop: 10,
        marginBottom: 8,
        paddingHorizontal: 16,
    },
    card: { borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 20, fontWeight: '800' },
    name: { fontSize: 16, fontWeight: '800' },
    sub: { fontSize: 13, fontWeight: '600', marginTop: 2 },
    amountBadge: { backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    amountText: { color: '#16A34A', fontWeight: '800', fontSize: 14 },
    purpose: { fontSize: 13, marginTop: 10, fontWeight: '500' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12, paddingTop: 10, borderTopWidth: 1, flexWrap: 'wrap' },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 11, fontWeight: '600' },
    overstayBadge: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    overstayText: { color: '#DC2626', fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
    checkedOutBadge: { backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    checkedOutText: { color: '#64748B', fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
    checkoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#16A34A', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    checkoutBtnText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
    cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    btn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    btnText: { fontSize: 11, fontWeight: '700' },
    fab: {
        position: 'absolute', bottom: 45, right: 24, width: 50, height: 50, borderRadius: 25,
        justifyContent: 'center', alignItems: 'center', elevation: 5,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3,
    },
});
