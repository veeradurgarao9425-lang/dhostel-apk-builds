import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
    StatusBar, RefreshControl,
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
import { SkeletonList } from '../components/ui/SkeletonCard';
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
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [dateFilter, setDateFilter] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const isMounted = useRef(false);
    const { showApiError, showSuccess } = useToast();

    // DangerModal state
    const [dangerModal, setDangerModal] = useState<{ visible: boolean; guest: any | null; mode: 'checkout' | 'delete' }>({
        visible: false, guest: null, mode: 'delete'
    });

    const fetchGuests = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const params: Record<string, any> = {};
            if (dateFilter) {
                params.date = toLocalDateStr(dateFilter);
            }
            const res = await api.get('/guests', { params });
            if (res.data?.success) {
                setGuests(res.data.data || []);
                setSummary(res.data.summary || { count: 0, totalCollected: 0 });
            }
        } catch (e) {
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
        setDangerModal({ visible: true, guest, mode: 'checkout' });
    };

    const handleDelete = (guest: any) => {
        setDangerModal({ visible: true, guest, mode: 'delete' });
    };

    const handleDangerConfirm = async () => {
        const { guest, mode } = dangerModal;
        setDangerModal(p => ({ ...p, visible: false }));
        if (!guest) return;
        try {
            if (mode === 'checkout') {
                await api.post(`/guests/${guest.guest_id}/checkout`);
                showSuccess('Guest checked out successfully.');
            } else {
                await api.delete(`/guests/${guest.guest_id}`);
                showSuccess('Guest record deleted.');
            }
            fetchGuests(true);
        } catch (e) {
            showApiError(e, mode === 'checkout' ? 'Failed to check out guest' : 'Failed to delete guest');
        }
    };

    const filtered = search.trim()
        ? guests.filter(g =>
            (g.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (g.phone || '').includes(search) ||
            (g.purpose || '').toLowerCase().includes(search.toLowerCase()))
        : guests;

    const renderItem = ({ item }: any) => (
        <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
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
                    <TouchableOpacity onPress={() => handleCheckout(item)} style={s.checkoutBtn} activeOpacity={0.8}>
                        <Ionicons name="log-out-outline" size={13} color="#FFF" />
                        <Text style={s.checkoutBtnText}>Check Out</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <View style={[s.root, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" />
            <AppHeader title="Guests" subtitle="Short-stay & daily visitors">
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
            <View style={[s.summaryStrip, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                <View style={s.summaryItem}>
                    <Text style={[s.summaryVal, { color: theme.textPrimary }]}>{summary.count}</Text>
                    <Text style={[s.summaryLbl, { color: theme.textSecondary }]}>Guests</Text>
                </View>
                <View style={[s.summaryDivider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                <View style={s.summaryItem}>
                    <Text style={[s.summaryVal, { color: '#16A34A' }]}>₹{summary.totalCollected.toLocaleString('en-IN')}</Text>
                    <Text style={[s.summaryLbl, { color: theme.textSecondary }]}>Collected</Text>
                </View>
            </View>

            {loading ? (
                <SkeletonList count={5} />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => String(item.guest_id)}
                    renderItem={renderItem}
                    contentContainerStyle={[
                        { padding: 16, paddingBottom: 120 },
                        filtered.length === 0 && { flex: 1 }
                    ]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchGuests(true); }} tintColor={theme.primary} />
                    }
                    ListEmptyComponent={
                        <EmptyState
                            variant={search.trim() ? 'noResults' : 'noData'}
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
                date={dateFilter || new Date()}
                onConfirm={(d) => { setDateFilter(d); setShowDatePicker(false); }}
                onCancel={() => setShowDatePicker(false)}
            />

            <DangerModal
                visible={dangerModal.visible}
                title={dangerModal.mode === 'checkout' ? 'Check Out Guest?' : 'Delete Guest?'}
                message={
                    dangerModal.mode === 'checkout'
                        ? `Mark ${dangerModal.guest?.full_name || 'this guest'} as checked out?`
                        : `Remove ${dangerModal.guest?.full_name || 'this guest'}'s record? This cannot be undone.`
                }
                confirmText={dangerModal.mode === 'checkout' ? 'Check Out' : 'Delete'}
                onCancel={() => setDangerModal(p => ({ ...p, visible: false }))}
                onConfirm={handleDangerConfirm}
            />
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
    summaryStrip: {
        flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 14,
        borderRadius: 16, borderWidth: 1, paddingVertical: 14,
    },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryDivider: { width: 1, height: 28 },
    summaryVal: { fontSize: 18, fontWeight: '900' },
    summaryLbl: { fontSize: 11, fontWeight: '600', marginTop: 2 },
    card: { borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1 },
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
    fab: {
        position: 'absolute', bottom: 45, right: 24, width: 50, height: 50, borderRadius: 25,
        justifyContent: 'center', alignItems: 'center', elevation: 5,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3,
    },
});
