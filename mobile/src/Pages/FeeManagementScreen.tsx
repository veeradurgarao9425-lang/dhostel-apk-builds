import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    FlatList,
    Modal,
    TextInput,
    Alert,
    ActivityIndicator,
    LayoutAnimation,
    RefreshControl,
    ScrollView,
    Linking
} from 'react-native';
import {
    AlertCircle,
    Search,
    MessageCircle,
    X,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { PaymentDrawer } from '../components/PaymentDrawer';
import { toLocalDateStr } from '../utils/dateUtils';
import { AppHeader } from '../components/AppHeader';
import { HeaderNotification } from '../components/HeaderNotification';
import { ProfileMenu } from '../components/ProfileMenu';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonList } from '../components/ui/SkeletonCard';
import { useTheme } from '../../contexts/ThemeContext';

const STATUS_THEME: any = {
    'Fully Paid': { label: 'PAID', color: '#10B981', bg: '#DCFCE7' },
    'Pending': { label: 'UNPAID', color: '#EF4444', bg: '#FEE2E2' },
    'Overdue': { label: 'LATE', color: '#B91C1C', bg: '#FEE2E2' },
    'Partially Paid': { label: 'PARTIAL', color: '#3B82F6', bg: '#DBEAFE' },
};

// ─── Avatar palette (mirrors PendingPaymentsScreen's naming-based palette) ────
const AVATAR_PALETTES = [
    { bg: '#EDE9FE', text: '#7C3AED' },
    { bg: '#DBEAFE', text: '#2563EB' },
    { bg: '#FEE2E2', text: '#DC2626' },
    { bg: '#FEF3C7', text: '#D97706' },
    { bg: '#DCFCE7', text: '#059669' },
    { bg: '#E0F2FE', text: '#0891B2' },
];
const avatarPalette = (name: string) => AVATAR_PALETTES[(name || '?').charCodeAt(0) % AVATAR_PALETTES.length];

// ─── INTERNAL MODAL COMPONENT (kept as-is; not currently rendered) ───────────
const UnusedCollectModal = ({ visible, onClose, fee, onSuccess, theme }: any) => {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);

    const total = parseFloat(fee?.total_amount || fee?.total_due || 0);
    const paid = parseFloat(fee?.amount_paid || fee?.paid_amount || 0);
    const remaining = Math.max(0, total - paid);

    useEffect(() => {
        if (visible && fee) setAmount(remaining.toString());
    }, [visible, fee]);

    const handleConfirm = async () => {
        if (!amount || parseFloat(amount) <= 0) return Alert.alert('Error', 'Enter a valid amount');
        try {
            setLoading(true);
            const res = await api.post('/monthly-fees/record-payment', {
                student_id: fee.student_id,
                hostel_id: fee.hostel_id,
                amount: parseFloat(amount),
                payment_date: new Date().toISOString().split('T')[0],
                due_date: fee.due_date?.substring(0, 10) || new Date().toISOString().split('T')[0],
                payment_mode_id: 1, // Defaulting to Cash for speed
                fee_month: fee.fee_month || new Date().toISOString().slice(0, 7)
            });
            if (res.data.success) {
                Toast.show({ type: 'success', text1: 'Payment Successful' });
                onSuccess();
            }
        } catch (e: any) {
            console.log('[FeeManagementScreen] Error details:', e.response?.data || e.message);
            const errMsg = e.response?.data?.error || e.response?.data?.message || e.message;
            Alert.alert('Error', errMsg || 'Could not save payment. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Collect Payment</Text>
                        <TouchableOpacity onPress={onClose} activeOpacity={0.7}><X color="#64748B" size={24} /></TouchableOpacity>
                    </View>
                    <Text style={styles.modalUser}>{fee?.first_name} {fee?.last_name}</Text>
                    <View style={styles.inputBox}>
                        <Text style={styles.inputLabel}>Enter Amount (₹)</Text>
                        <TextInput
                            style={styles.modalInput}
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                            autoFocus
                        />
                        <Text style={styles.inputHint}>Total Outstanding: ₹{remaining}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.confirmBtn, { backgroundColor: theme.primary }]}
                        onPress={handleConfirm}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmBtnText}>CONFIRM COLLECTION</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const TABS = ['All', 'Unpaid', 'Partial', 'Paid'] as const;

// ─── MAIN SCREEN COMPONENT ──────────────────────────────────────────
export default function FeeManagementScreen() {
    const navigation = useNavigation<any>();
    const { theme, isDark } = useTheme();
    const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Unpaid');
    const [search, setSearch] = useState('');
    const [floorFilter, setFloorFilter] = useState('');
    const [roomFilter, setRoomFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [fees, setFees] = useState<any[]>([]);
    const [payModalVisible, setPayModalVisible] = useState(false);
    const [selectedFee, setSelectedFee] = useState<any>(null);

    const [payAmount, setPayAmount] = useState('');
    const [payNotes, setPayNotes] = useState('');
    const [payTransactionId, setPayTransactionId] = useState('');
    const [payDate, setPayDate] = useState(() => toLocalDateStr(new Date()));
    const [payDueDate, setPayDueDate] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() + 1); return toLocalDateStr(d);
    });
    const [payModeId, setPayModeId] = useState('');
    const [payLoading, setPayLoading] = useState(false);
    const [paymentModes, setPaymentModes] = useState<any[]>([]);

    useEffect(() => {
        const fetchModes = async () => {
            try {
                const res = await api.get('/monthly-fees/payment-modes');
                if (res.data.success) {
                    setPaymentModes(res.data.data);
                }
            } catch {
                setPaymentModes([
                    { payment_mode_id: 1, payment_mode_name: 'Cash' },
                    { payment_mode_id: 2, payment_mode_name: 'UPI' }
                ]);
            }
        };
        fetchModes();
    }, []);

    const fetchData = useCallback(async (showLoader = false) => {
        try {
            if (showLoader) setLoading(true);
            const res = await api.get('/monthly-fees/summary');
            if (res.data.success) setFees(res.data.data.fees || []);
        } catch (e) {
            Toast.show({ type: 'error', text1: 'Sync Failed' });
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

    const totalOutstanding = useMemo(() => {
        return fees.reduce((sum, f) => {
            const total = parseFloat(f.total_due || f.total_amount || 0);
            const paid = parseFloat(f.paid_amount || f.amount_paid || 0);
            return sum + Math.max(0, total - paid);
        }, 0);
    }, [fees]);

    // ── Tab counts (display-only, derived from the already-fetched fees list) ──
    const tabCounts = useMemo(() => ({
        All: fees.length,
        Unpaid: fees.filter(f => f.fee_status === 'Pending' || f.fee_status === 'Overdue').length,
        Partial: fees.filter(f => f.fee_status === 'Partially Paid').length,
        Paid: fees.filter(f => f.fee_status === 'Fully Paid').length,
    }), [fees]);

    const filteredFees = useMemo(() => {
        return fees.filter(f => {
            const name = `${f.first_name || ''} ${f.last_name || ''}`.toLowerCase();
            const matchesSearch = name.includes(search.toLowerCase()) || f.room_number?.toString().includes(search);
            const matchesFloor = floorFilter ? f.floor_number?.toString() === floorFilter : true;
            const matchesRoom = roomFilter ? f.room_number?.toString() === roomFilter : true;

            let matchesTab = true;
            if (activeTab === 'Unpaid') matchesTab = (f.fee_status === 'Pending' || f.fee_status === 'Overdue');
            else if (activeTab === 'Paid') matchesTab = (f.fee_status === 'Fully Paid');
            else if (activeTab === 'Partial') matchesTab = (f.fee_status === 'Partially Paid');

            return matchesSearch && matchesFloor && matchesRoom && matchesTab;
        });
    }, [fees, search, activeTab, floorFilter, roomFilter]);

    const clearFilters = () => {
        setSearch('');
        setFloorFilter('');
        setRoomFilter('');
        setActiveTab('All');
    };

    const handleCollectRent = useCallback(async () => {
        if (!payAmount || parseFloat(payAmount) <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount'); return;
        }
        if (!selectedFee) return;

        try {
            setPayLoading(true);
            const payload: any = {
                student_id: selectedFee.student_id,
                hostel_id: selectedFee.hostel_id,
                amount: parseFloat(payAmount),
                payment_date: payDate,
                due_date: payDueDate,
                payment_mode_id: parseInt(payModeId || '1'),
                notes: payNotes || null,
                transaction_id: payTransactionId || null,
                fee_month: selectedFee.fee_month || new Date().toISOString().slice(0, 7),
            };
            const res = await api.post('/monthly-fees/record-payment', payload);
            if (res.data.success) {
                Toast.show({ type: 'success', text1: 'Payment recorded successfully!' });
                setPayModalVisible(false);
                fetchData(true);
            }
        } catch (error: any) {
            console.log('[FeeManagementScreen] Error saving payment:', error.response?.data || error.message);
            const serverError = error.response?.data?.error || error.response?.data?.message || error.message;
            Alert.alert('Error', serverError || 'Failed to record payment');
        } finally {
            setPayLoading(false);
        }
    }, [selectedFee, payAmount, payDate, payDueDate, payModeId, payNotes, payTransactionId, fetchData]);

    const renderFeeCard = ({ item }: { item: any }) => {
        const style = STATUS_THEME[item.fee_status] || STATUS_THEME['Pending'];
        const total = parseFloat(item.total_amount || item.total_due || 0);
        const paid = parseFloat(item.amount_paid || item.paid_amount || 0);
        const due = Math.max(0, total - paid);
        const fullName = `${item.first_name || ''} ${item.last_name || ''}`.trim();
        const initial = fullName ? fullName[0].toUpperCase() : '?';
        const palette = avatarPalette(fullName);
        const isSettled = due <= 0;

        return (
            <View style={[
                styles.feeCard,
                {
                    backgroundColor: theme.cardBg,
                    borderColor: isDark ? '#334155' : '#F1F5F9',
                }
            ]}>
                <View style={[styles.cardAccentLine, { backgroundColor: style.color }]} />
                <View style={styles.cardInner}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.avatar, { backgroundColor: palette.bg }]}>
                            <Text style={[styles.avatarTxt, { color: palette.text }]}>{initial}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.studentName, { color: theme.textPrimary }]} numberOfLines={1}>{fullName || 'Unknown'}</Text>
                            <Text style={[styles.roomText, { color: theme.textSecondary }]}>Room {item.room_number || 'N/A'}</Text>
                        </View>
                        <View style={[styles.statusTag, { backgroundColor: isDark ? style.color + '25' : style.bg }]}>
                            <Text style={[styles.statusText, { color: style.color }]}>{style.label}</Text>
                        </View>
                    </View>

                    {isSettled ? (
                        <View style={[styles.settledRow, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                            <Text style={[styles.settledText, { color: '#10B981' }]}>✓ Paid ₹{total.toLocaleString('en-IN')} in full</Text>
                        </View>
                    ) : (
                        <View style={[styles.financialRow, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                            <View style={styles.priceBlock}>
                                <Text style={[styles.finLabel, { color: theme.textSecondary }]}>RENT</Text>
                                <Text style={[styles.finValSmall, { color: theme.textSecondary }]}>₹{total.toLocaleString('en-IN')}</Text>
                            </View>
                            <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                            <View style={styles.priceBlock}>
                                <Text style={[styles.finLabel, { color: '#EF4444' }]}>BALANCE DUE</Text>
                                <Text style={[styles.finVal, { color: '#EF4444' }]}>₹{due.toLocaleString('en-IN')}</Text>
                            </View>
                            <View style={styles.actionGroup}>
                                <TouchableOpacity
                                    style={[styles.nudgeBtn, { backgroundColor: isDark ? '#14532D' : '#DCFCE7' }]}
                                    onPress={() => Linking.openURL(`whatsapp://send?phone=91${item.phone}&text=Hi ${item.first_name}, rent balance ₹${due} is pending.`)}
                                    activeOpacity={0.75}
                                >
                                    <MessageCircle size={20} color="#22C55E" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.collectBtn, { backgroundColor: theme.primary }]}
                                    onPress={() => {
                                        setSelectedFee(item);
                                        setPayAmount(due.toString());
                                        const upiMode = (paymentModes || []).find((m: any) => m.payment_mode_name?.toLowerCase() === 'upi');
                                        const defaultMode = upiMode ? upiMode.payment_mode_id.toString() : (paymentModes?.[0]?.payment_mode_id?.toString() || '1');
                                        setPayModeId(defaultMode);
                                        setPayNotes('');
                                        setPayTransactionId('');
                                        setPayDate(toLocalDateStr(new Date()));
                                        const next = new Date(); next.setMonth(next.getMonth() + 1);
                                        setPayDueDate(toLocalDateStr(next));
                                        setPayModalVisible(true);
                                    }}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.collectBtnText}>COLLECT</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" />
            <AppHeader
                title="Fee Management"
                subtitle="Track dues & collect rent"
                showBack={navigation.canGoBack()}
                rightComponent={
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <HeaderNotification navigation={navigation} />
                        <ProfileMenu />
                    </View>
                }
            />

            {/* ── Outstanding summary ── */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: isDark ? '#2D1919' : '#FFF1F1', borderColor: isDark ? '#7F1D1D' : '#FEE2E2' }]}>
                    <View style={[styles.statIconWrap, { backgroundColor: isDark ? '#3F1F1F' : '#FEE2E2' }]}>
                        <AlertCircle size={16} color="#EF4444" />
                    </View>
                    <Text style={[styles.statLabel, { color: isDark ? '#FCA5A5' : '#EF4444' }]}>Total Outstanding</Text>
                    <Text style={[styles.statValue, { color: isDark ? '#FEE2E2' : '#991B1B' }]}>₹{totalOutstanding.toLocaleString('en-IN')}</Text>
                </View>
            </View>

            {/* ── Search ── */}
            <View style={styles.searchSection}>
                <View style={[styles.searchBar, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                    <Search color={isDark ? '#94A3B8' : '#94A3B8'} size={18} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.textPrimary }]}
                        placeholder="Search student or room..."
                        placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7} style={{ padding: 4 }}>
                            <X color={isDark ? '#94A3B8' : '#94A3B8'} size={16} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* ── Status tabs ── */}
            <View style={styles.tabsRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {TABS.map(t => {
                        const isActive = activeTab === t;
                        return (
                            <TouchableOpacity
                                key={t}
                                style={[
                                    styles.tabPill,
                                    {
                                        backgroundColor: isActive ? theme.primary : (isDark ? '#1E293B' : '#F1F5F9'),
                                        borderColor: isActive ? theme.primary : (isDark ? '#334155' : '#E2E8F0'),
                                    }
                                ]}
                                onPress={() => { LayoutAnimation.easeInEaseOut(); setActiveTab(t); }}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.tabPillText, { color: isActive ? '#FFF' : (isDark ? '#94A3B8' : '#64748B') }]}>{t}</Text>
                                {tabCounts[t] > 0 && (
                                    <View style={[styles.tabBadge, { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : theme.primary + '20' }]}>
                                        <Text style={[styles.tabBadgeText, { color: isActive ? '#FFF' : theme.primary }]}>{tabCounts[t]}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                    {(search || floorFilter || roomFilter || activeTab !== 'All') && (
                        <TouchableOpacity style={styles.clearPill} onPress={clearFilters} activeOpacity={0.8}>
                            <Text style={[styles.clearPillText, { color: theme.primary }]}>Clear</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </View>

            {initialLoading ? (
                <SkeletonList count={5} />
            ) : (
                <FlatList
                    data={filteredFees}
                    renderItem={renderFeeCard}
                    keyExtractor={(item, index) => item.fee_id?.toString() || index.toString()}
                    contentContainerStyle={[
                        styles.list,
                        filteredFees.length === 0 && { flexGrow: 1, justifyContent: 'center' }
                    ]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchData(true)} tintColor={theme.primary} />}
                    ListEmptyComponent={
                        <EmptyState illustration="pending"
                            title={search ? 'No Results' : 'No Records Found'}
                            subtitle={search ? `No fees match "${search}"` : 'Fee records for this filter will appear here.'}
                        />
                    }
                />
            )}

            <PaymentDrawer
                visible={payModalVisible}
                onClose={() => setPayModalVisible(false)}
                selectedFee={selectedFee}
                paymentModes={paymentModes}
                payAmount={payAmount} setPayAmount={setPayAmount}
                payNotes={payNotes} setPayNotes={setPayNotes}
                payTransactionId={payTransactionId} setPayTransactionId={setPayTransactionId}
                payDate={payDate} setPayDate={setPayDate}
                payDueDate={payDueDate} setPayDueDate={setPayDueDate}
                payModeId={payModeId} setPayModeId={setPayModeId}
                payLoading={payLoading}
                onConfirm={handleCollectRent}
                themeColor={theme.primary}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },

    // ── Stats ──
    statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 14 },
    statCard: { flex: 1, borderRadius: 14, padding: 12, borderWidth: 1 },
    statIconWrap: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    statLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    statValue: { fontSize: 20, fontWeight: '900' },

    // ── Search ──
    searchSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
    searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, height: 44, gap: 10, borderWidth: 1 },
    searchInput: { flex: 1, fontSize: 14, fontWeight: '500' },

    // ── Tabs ──
    tabsRow: { paddingHorizontal: 16, paddingVertical: 10 },
    tabPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1.5 },
    tabPillText: { fontSize: 12, fontWeight: '700' },
    tabBadge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
    tabBadgeText: { fontSize: 10, fontWeight: '800' },
    clearPill: { justifyContent: 'center', paddingHorizontal: 10 },
    clearPillText: { fontSize: 12, fontWeight: '700' },

    // ── List ──
    list: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 4 },

    // ── Fee card ──
    feeCard: { borderRadius: 18, marginBottom: 10, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    cardAccentLine: { width: 4 },
    cardInner: { flex: 1, padding: 14 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    avatarTxt: { fontSize: 16, fontWeight: '900' },
    studentName: { fontSize: 14, fontWeight: '800' },
    roomText: { fontSize: 12, fontWeight: '600', marginTop: 1 },
    statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '900' },
    financialRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
    settledRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
    settledText: { fontSize: 13, fontWeight: '700' },
    priceBlock: { alignItems: 'flex-start' },
    finLabel: { fontSize: 9, fontWeight: '800', marginBottom: 2 },
    finVal: { fontSize: 19, fontWeight: '900' },
    finValSmall: { fontSize: 14, fontWeight: '700' },
    divider: { width: 1, height: 30 },
    actionGroup: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    nudgeBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    collectBtn: { paddingHorizontal: 16, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    collectBtnText: { color: '#FFF', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },

    // Modal Styles (used by UnusedCollectModal, kept for parity)
    modalOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
    modalUser: { fontSize: 15, color: '#64748B', marginBottom: 25, fontWeight: '600' },
    inputBox: { marginBottom: 30 },
    inputLabel: { fontSize: 12, fontWeight: '800', color: '#94A3B8', marginBottom: 10 },
    modalInput: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 18, fontSize: 24, fontWeight: '900', color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0' },
    inputHint: { fontSize: 11, color: '#94A3B8', marginTop: 10, fontWeight: '600' },
    confirmBtn: { height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 4 },
    confirmBtnText: { color: '#FFF', fontWeight: '900', fontSize: 15, letterSpacing: 1 }
});
