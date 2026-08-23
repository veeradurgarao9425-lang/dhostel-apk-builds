import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
    StatusBar, RefreshControl, ScrollView, Image, Linking, Modal, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Plus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { toLocalDateStr } from '../utils/dateUtils';
import { getResolvedImageUrl } from '../utils/imageHelper';
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
    const [activeTab, setActiveTab] = useState<'All' | 'pending' | 'staying' | 'checked_out'>('All');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const isMounted = useRef(false);
    const { showApiError, showSuccess } = useToast();

    // DangerModal state
    const [dangerModal, setDangerModal] = useState<{ visible: boolean; guest: any | null; mode: 'checkout' | 'delete' }>({
        visible: false, guest: null, mode: 'delete'
    });

    const [previewImage, setPreviewImage] = useState<string | null>(null);

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

    const renderItem = ({ item }: any) => {
        const isPending = item.status === 'pending';
        const isStaying = item.status === 'staying' || (!item.status && !isPending);
        const isOverstay = item.is_overstay;
        const isCheckedOut = item.status === 'checked_out';

        return (
            <TouchableOpacity 
                activeOpacity={0.85}
                onPress={() => {
                    navigation.navigate('GuestDetails', { guestId: item.guest_id, guest: item });
                }}
                style={[
                    s.card,
                    {
                        backgroundColor: theme.cardBg,
                        borderColor: isPending ? '#FDE68A' : isOverstay ? '#FCA5A5' : (isDark ? '#334155' : '#E2E8F0'),
                    }
                ]}
            >
                <View style={s.cardTop}>
                    {/* Photo Avatar or Initials */}
                    <View style={[s.avatar, { backgroundColor: isDark ? '#334155' : '#EDE9FE', borderColor: isPending ? '#F59E0B' : theme.primary }]}>
                        {item.profile_photo_url ? (
                            <Image source={{ uri: item.profile_photo_url }} style={s.avatarImg} />
                        ) : (
                            <Text style={[s.avatarText, { color: isPending ? '#F59E0B' : theme.primary }]}>
                                {(item.full_name || 'G')[0].toUpperCase()}
                            </Text>
                        )}
                    </View>

                    {/* Name, Phone, and Status Badges */}
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={[s.name, { color: theme.textPrimary }]} numberOfLines={1}>
                                {item.full_name}
                            </Text>
                            
                            {isPending && (
                                <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#FDE68A' }}>
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#D97706' }}>PENDING QR</Text>
                                </View>
                            )}
                            {isOverstay && (
                                <View style={s.overstayBadge}>
                                    <Text style={s.overstayText}>OVERSTAY</Text>
                                </View>
                            )}
                            {isCheckedOut && (
                                <View style={s.checkedOutBadge}>
                                    <Text style={s.checkedOutText}>CHECKED OUT</Text>
                                </View>
                            )}
                            {isStaying && !isOverstay && !isPending && (
                                <View style={s.stayingBadge}>
                                    <Text style={s.stayingText}>ACTIVE STAY</Text>
                                </View>
                            )}
                        </View>
                        {!!item.phone && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Ionicons name="call-outline" size={12} color={theme.textSecondary} />
                                <Text style={[s.sub, { color: theme.textSecondary }]}>{item.phone}</Text>
                            </View>
                        )}
                    </View>

                    {/* Amount Collected & Quick Edit */}
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        {!isPending ? (
                            <View style={s.amountBadge}>
                                <Text style={s.amountText}>₹{Number(item.amount_paid || 0).toLocaleString('en-IN')}</Text>
                            </View>
                        ) : (
                            <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#D97706' }}>New Request</Text>
                            </View>
                        )}
                        <TouchableOpacity 
                            onPress={() => navigation.navigate('AddGuest', { guest: item, isEdit: true, isCheckinPending: isPending })} 
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={{ padding: 2 }}
                        >
                            <Ionicons name="create-outline" size={18} color="#3B82F6" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Purpose if present */}
                {!!item.purpose && (
                    <View style={[s.purposeWrap, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
                        <Ionicons name="information-circle-outline" size={13} color={theme.primary} />
                        <Text style={[s.purpose, { color: theme.textSecondary }]} numberOfLines={1}>{item.purpose}</Text>
                    </View>
                )}

                {/* Bottom Meta Row */}
                <View style={[s.metaRow, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                    <View style={s.metaItem}>
                        <Ionicons name="log-in-outline" size={14} color="#16A34A" />
                        <Text style={[s.metaText, { color: theme.textSecondary }]}>{fmtDate(item.check_in_date)}</Text>
                    </View>

                    {!!item.room_number && (
                        <View style={[s.metaItem, s.roomBadge]}>
                            <Ionicons name="bed" size={12} color="#2563EB" />
                            <Text style={[s.metaText, { color: '#2563EB', fontWeight: '700' }]}>Room {item.room_number}</Text>
                        </View>
                    )}

                    <View style={s.metaItem}>
                        <Ionicons name="moon-outline" size={13} color={theme.primary} />
                        <Text style={[s.metaText, { color: theme.textSecondary }]}>
                            {Number(item.days || 1) === 1 ? '1 day' : `${item.days || 1} days`}
                        </Text>
                    </View>

                    <View style={{ flex: 1 }} />

                    {isPending ? (
                        <TouchableOpacity 
                            style={[s.btn, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]} 
                            onPress={() => navigation.navigate('AddGuest', { guest: item, isEdit: true, isCheckinPending: true })}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                            <Text style={[s.btnText, { color: '#16A34A', fontWeight: '800' }]}>Check-In</Text>
                        </TouchableOpacity>
                    ) : isStaying ? (
                        <TouchableOpacity 
                            style={[s.btn, { backgroundColor: isDark ? '#1E1B4B' : '#EDE9FE', borderColor: '#C4B5FD' }]} 
                            onPress={() => handleCheckout(item)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="log-out-outline" size={14} color="#7C3AED" />
                            <Text style={[s.btnText, { color: '#7C3AED' }]}>Check Out</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </TouchableOpacity>
        );
    };

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
                        <Ionicons name={dateFilter ? "calendar" : "calendar-outline"} size={20} color={dateFilter ? theme.primary : "#64748B"} />
                    </TouchableOpacity>
                    {dateFilter && (
                        <TouchableOpacity onPress={() => setDateFilter(null)} style={{ marginLeft: 4, padding: 4 }}>
                            <Ionicons name="close-circle" size={18} color="#DC2626" />
                        </TouchableOpacity>
                    )}
                </View>
            </AppHeader>

            {/* Stat Row */}
            <View style={{ paddingHorizontal: 16, marginTop: 12, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <MiniStatCard 
                        title="Collected Fees" 
                        value={`₹${summary.totalCollected.toLocaleString('en-IN')}`} 
                        icon="cash-outline" 
                        color="#10B981" 
                    />
                    <MiniStatCard 
                        title="Active Guests" 
                        value={guests.filter(g => g.status === 'staying').length} 
                        icon="log-in-outline" 
                        color="#F59E0B" 
                    />
                    {guests.filter(g => g.status === 'pending').length > 0 && (
                        <MiniStatCard 
                            title="Pending QR" 
                            value={guests.filter(g => g.status === 'pending').length} 
                            icon="qr-code-outline" 
                            color="#8B5CF6" 
                        />
                    )}
                </View>
            </View>

            {/* Tabs */}
            <View style={{ paddingHorizontal: 16, marginBottom: 0 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {[
                        { id: 'All', label: 'All' },
                        { id: 'pending', label: 'Pending' },
                        { id: 'staying', label: 'Active Stay' },
                        { id: 'checked_out', label: 'Checked Out' },
                    ].map(tab => {
                        const isSel = activeTab === tab.id;
                        const count = guests.filter(g => tab.id === 'All' ? true : g.status === tab.id).length;
                        return (
                            <TouchableOpacity
                                key={tab.id}
                                onPress={() => setActiveTab(tab.id as any)}
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
                                }}>{tab.label}</Text>
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
                            <Text style={{ fontSize: 16, fontWeight: '800', color: isDark ? '#FFF' : '#1F2937' }}>
                                Check Out — {checkoutSheet.guest?.full_name || 'Guest'}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                                {Number(checkoutSheet.guest?.days) || 1} day(s) × ₹{Number(checkoutSheet.guest?.per_day_amount) || 0}/day
                            </Text>
                        </View>
                    </View>

                    {/* Bill Summary */}
                    <View style={{ backgroundColor: isDark ? '#14532D30' : '#F0FDF4', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#BBF7D0', gap: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 13, color: isDark ? '#CBD5E1' : '#374151' }}>Computed Bill</Text>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#059669' }}>₹{checkoutSheet.totalBill.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={{ height: 1, backgroundColor: isDark ? '#334155' : '#BBF7D0' }} />
                        <Text style={{ fontSize: 11, color: isDark ? '#94A3B8' : '#6B7280' }}>
                            💡 You can adjust the amount below if there are additional charges or discounts.
                        </Text>
                    </View>

                    {/* Editable final amount */}
                    <View>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#CBD5E1' : '#374151', marginBottom: 6 }}>Final Amount to Collect (₹)</Text>
                        <TextInput
                            style={{
                                borderWidth: 1.5, borderColor: isDark ? '#475569' : '#D1D5DB', borderRadius: 10,
                                paddingHorizontal: 14, paddingVertical: 10,
                                fontSize: 18, fontWeight: '800', color: theme.textPrimary,
                                backgroundColor: isDark ? '#1E293B' : '#FFF',
                            }}
                            keyboardType="numeric"
                            value={checkoutSheet.finalAmount}
                            onChangeText={(v) => setCheckoutSheet(p => ({ ...p, finalAmount: v.replace(/[^0-9.]/g, '') }))}
                            placeholder="0"
                            placeholderTextColor="#94A3B8"
                        />
                    </View>

                    {/* Action Buttons */}
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                            style={{ flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: isDark ? '#334155' : '#F1F5F9', alignItems: 'center' }}
                            onPress={() => setCheckoutSheet(p => ({ ...p, visible: false }))}
                            activeOpacity={0.8}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#CBD5E1' : '#64748B' }}>Cancel</Text>
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

            {/* ── Zoomed Fullscreen Image Preview Modal ── */}
            {previewImage && (
                <Modal visible={true} transparent={true} animationType="fade" onRequestClose={() => setPreviewImage(null)}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' }}>
                        <TouchableOpacity
                            style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
                            onPress={() => setPreviewImage(null)}
                        >
                            <Ionicons name="close" size={24} color="#FFF" />
                        </TouchableOpacity>
                        <Image
                            source={{ uri: previewImage }}
                            style={{ width: '92%', height: '80%', resizeMode: 'contain' }}
                        />
                    </View>
                </Modal>
            )}
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
    card: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 4,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1 },
    avatarImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    avatarText: { fontSize: 20, fontWeight: '800' },
    name: { fontSize: 16, fontWeight: '800' },
    sub: { fontSize: 13, fontWeight: '600' },
    amountBadge: { backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    amountText: { color: '#16A34A', fontWeight: '800', fontSize: 14 },
    purposeWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    purpose: { fontSize: 12, fontWeight: '600' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, paddingTop: 10, borderTopWidth: 1, flexWrap: 'wrap' },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 11, fontWeight: '600' },
    roomBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    stayingBadge: { backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    stayingText: { color: '#16A34A', fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
    overstayBadge: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    overstayText: { color: '#DC2626', fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
    checkedOutBadge: { backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    checkedOutText: { color: '#64748B', fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
    checkoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#16A34A', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    checkoutBtnText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
    cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    btn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
    btnText: { fontSize: 12, fontWeight: '800' },
    fab: {
        position: 'absolute', bottom: 95, right: 20, width: 52, height: 52, borderRadius: 26,
        justifyContent: 'center', alignItems: 'center', elevation: 10,
        shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 6, zIndex: 99999,
    },
});
