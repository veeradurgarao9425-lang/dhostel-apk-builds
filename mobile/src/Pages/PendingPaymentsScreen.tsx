import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, StatusBar,
    FlatList, Linking, Modal,
    RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import Toast from 'react-native-toast-message';
import { HeaderNotification } from '../components/HeaderNotification';
import { ProfileMenu } from '../components/ProfileMenu';
import { PaymentDrawer } from '../components/PaymentDrawer';
import { useTheme } from '../../contexts/ThemeContext';
import { toLocalDateStr } from '../utils/dateUtils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DueTenant {
    id: number;
    name: string;
    first_name: string;
    last_name: string;
    phone: string;
    room: string;
    room_number: string;
    hostel_id: number;
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    feeMonth: string;
    dueDate: string;
    daysOverdue: number;
    isOverdue: boolean;
    status: string;
}

const sf = (v: any): number => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

// ─── Avatar color by name ─────────────────────────────────────────────────────
const AVATAR_COLORS = ['#7C3AED', '#2563EB', '#DC2626', '#D97706', '#059669', '#0891B2', '#7C3AED'];
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

// ─── Sort options ─────────────────────────────────────────────────────────────
type SortType = 'amount' | 'room' | 'overdue';

// ─── Remind Modal ─────────────────────────────────────────────────────────────
const RemindModal = ({ visible, tenant, onClose }: {
    visible: boolean;
    tenant: DueTenant | null;
    onClose: () => void;
}) => {
    if (!tenant) return null;

    const callTenant = () => {
        onClose();
        if (!tenant.phone) { Toast.show({ type: 'error', text1: 'No phone number available' }); return; }
        Linking.openURL(`tel:${tenant.phone}`);
    };

    const whatsappRemind = () => {
        onClose();
        if (!tenant.phone) { Toast.show({ type: 'error', text1: 'No phone number available' }); return; }
        const msg = `Hi ${tenant.name.split(' ')[0]}, this is a friendly reminder that your rent of ₹${tenant.dueAmount.toLocaleString('en-IN')} is pending for ${tenant.feeMonth}. Please clear it at the earliest. Thank you! 🏠`;
        Linking.openURL(`whatsapp://send?phone=91${tenant.phone}&text=${encodeURIComponent(msg)}`);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity style={rm.backdrop} activeOpacity={1} onPress={onClose} />
            <View style={rm.sheet}>
                <View style={rm.handle} />
                {/* Header */}
                <View style={rm.header}>
                    <View style={[rm.avatarCircle, { backgroundColor: avatarColor(tenant.name) + '20' }]}>
                        <Text style={[rm.avatarText, { color: avatarColor(tenant.name) }]}>
                            {tenant.name[0].toUpperCase()}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={rm.tenantName}>{tenant.name}</Text>
                        <Text style={rm.tenantRoom}>Room {tenant.room} · ₹{tenant.dueAmount.toLocaleString('en-IN')} due</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={rm.closeBtn}>
                        <Ionicons name="close" size={18} color="#64748B" />
                    </TouchableOpacity>
                </View>

                <Text style={rm.subtitle}>Send a reminder to this tenant:</Text>

                {/* Options */}
                <TouchableOpacity style={rm.option} onPress={callTenant} activeOpacity={0.8}>
                    <View style={[rm.optionIcon, { backgroundColor: '#DCFCE7' }]}>
                        <Ionicons name="call" size={22} color="#16A34A" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={rm.optionLabel}>Call Tenant</Text>
                        <Text style={rm.optionSub}>Directly dial {tenant.phone || 'their number'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                </TouchableOpacity>

                <TouchableOpacity style={rm.option} onPress={whatsappRemind} activeOpacity={0.8}>
                    <View style={[rm.optionIcon, { backgroundColor: '#DCFCE7' }]}>
                        <Ionicons name="logo-whatsapp" size={22} color="#22C55E" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={rm.optionLabel}>WhatsApp Reminder</Text>
                        <Text style={rm.optionSub}>Send a payment reminder message</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                </TouchableOpacity>

                <View style={rm.spacer} />
            </View>
        </Modal>
    );
};

// ─── CollectDrawer is now shared ─────────────────────────────────────────────
// Removed: the inline CollectDrawer (120 lines) was identical to the one in
// FinanceScreen.tsx. Both screens now import PaymentDrawer from components/.


// ─── Tenant Card ──────────────────────────────────────────────────────────────
const TenantDueCard = React.memo(({ item, themeColor, onRemind, onCollect }: {
    item: DueTenant;
    themeColor: string;
    onRemind: (t: DueTenant) => void;
    onCollect: (t: DueTenant) => void;
}) => {
    const accentColor = item.isOverdue ? '#DC2626' : '#D97706';
    const accentBg    = item.isOverdue ? '#FEE2E2' : '#FEF3C7';
    const tagLabel    = item.isOverdue
        ? `${item.daysOverdue}d overdue`
        : `Due: ${item.dueDate}`;

    return (
        <View style={tc.card}>
            <View style={[tc.accentBar, { backgroundColor: accentColor }]} />
            <View style={tc.inner}>
                {/* Header Row: Avatar + Info + Amount */}
                <View style={tc.rowHeader}>
                    <View style={[tc.avatar, { backgroundColor: avatarColor(item.name) + '18' }]}>
                        <Text style={[tc.avatarTxt, { color: avatarColor(item.name) }]}>
                            {item.name[0].toUpperCase()}
                        </Text>
                    </View>
                    
                    <View style={tc.infoCol}>
                        <Text style={tc.name}>{item.name}</Text>
                        <Text style={tc.roomText}>Room {item.room} · {item.feeMonth}</Text>
                        
                        <View style={[tc.statusBadge, { backgroundColor: accentBg }]}>
                            <Ionicons name="time-outline" size={11} color={accentColor} />
                            <Text style={[tc.statusText, { color: accentColor }]}>{tagLabel}</Text>
                        </View>
                    </View>

                    <View style={tc.amountCol}>
                        <Text style={tc.amountLabel}>Pending</Text>
                        <Text style={[tc.amountVal, { color: accentColor }]}>
                            ₹{item.dueAmount.toLocaleString('en-IN')}
                        </Text>
                    </View>
                </View>

                {/* Divider */}
                <View style={tc.divider} />

                {/* Action buttons */}
                <View style={tc.actions}>
                    <TouchableOpacity
                        style={tc.remindBtn}
                        onPress={() => onRemind(item)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="notifications-outline" size={15} color="#475569" />
                        <Text style={tc.remindText}>Remind</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[tc.collectBtn, { backgroundColor: themeColor }]}
                        onPress={() => onCollect(item)}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="checkmark-circle-outline" size={15} color="#FFF" />
                        <Text style={tc.collectText}>Collect</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PendingPaymentsScreen() {
    const navigation = useNavigation<any>();
    const { theme } = useTheme();

    const [tenants, setTenants]     = useState<DueTenant[]>([]);
    const [loading, setLoading]     = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [remindTarget, setRemindTarget] = useState<DueTenant | null>(null);

    // Modal / Collect Drawer States
    const [collectModalVisible, setCollectModalVisible] = useState(false);
    const [selectedFee, setSelectedFee] = useState<any>(null);
    const [payAmount, setPayAmount] = useState('');
    const [payNotes, setPayNotes] = useState('');
    const [payTransactionId, setPayTransactionId] = useState('');
    const [payDate, setPayDate] = useState(() => toLocalDateStr(new Date()));
    const [payDueDate, setPayDueDate] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() + 1); return toLocalDateStr(d);
    });
    const [paymentModes, setPaymentModes] = useState<any[]>([]);
    const [payModeId, setPayModeId] = useState('1');
    const [payLoading, setPayLoading] = useState(false);

    const modesLoadedRef = useRef(false);
    const isFirstLoadRef = useRef(true);

    // ── Fetch data ───────────────────────────────────────────────────────────
    const load = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh && isFirstLoadRef.current) setLoading(true);

            // Fetch payment modes if empty
            if (!modesLoadedRef.current) {
                const modesRes = await api.get('/monthly-fees/payment-modes').catch(() => null);
                if (modesRes?.data?.success) {
                    const modes = modesRes.data.data;
                    setPaymentModes(modes);
                    const first = modes[0];
                    if (first) {
                        setPayModeId((first.payment_mode_id || first.id)?.toString() || '1');
                    }
                    modesLoadedRef.current = true;
                }
            }

            const res: any = await api.get('/monthly-fees/summary').catch(() => ({ data: { success: false } }));
            if (!res.data.success) return;

            const fees: any[] = res.data.data?.fees || (Array.isArray(res.data.data) ? res.data.data : []);
            const now = new Date(); now.setHours(0, 0, 0, 0);

            const PAID_SET = new Set(['paid', 'fully paid', 'cleared']);

            const pending: DueTenant[] = fees
                .filter(f => {
                    const status = (f.fee_status || '').toLowerCase();
                    const due = Math.max(0, sf(f.total_amount || f.total_due || f.monthly_rent) - sf(f.amount_paid || f.paid_amount));
                    return due > 0 && !PAID_SET.has(status);
                })
                .map(f => {
                    const total = sf(f.total_amount || f.total_due || f.monthly_rent || 0);
                    const paid  = sf(f.amount_paid || f.paid_amount || 0);
                    const due   = Math.max(0, total - paid);

                    const dueDateObj = f.due_date ? new Date(f.due_date) : new Date();
                    dueDateObj.setHours(0, 0, 0, 0);
                    const diffDays = Math.floor((now.getTime() - dueDateObj.getTime()) / 86400000);

                    const dueMonth = f.fee_month || f.month || '';
                    const dueDateStr = f.due_date
                        ? new Date(f.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                        : '';

                    return {
                        id: f.student_id,
                        name: `${f.first_name || ''} ${f.last_name || ''}`.trim(),
                        first_name: f.first_name || '',
                        last_name: f.last_name || '',
                        phone: f.phone || '',
                        room: f.room_number || 'N/A',
                        room_number: f.room_number || 'N/A',
                        hostel_id: f.hostel_id,
                        totalAmount: total,
                        paidAmount: paid,
                        dueAmount: due,
                        feeMonth: dueMonth,
                        dueDate: dueDateStr,
                        daysOverdue: Math.max(0, diffDays),
                        isOverdue: diffDays > 0,
                        status: f.fee_status || 'pending',
                    };
                });

            setTenants(pending);
        } catch {
            Toast.show({ type: 'error', text1: 'Failed to load pending dues' });
        } finally {
            isFirstLoadRef.current = false;
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    // ── Summary ──────────────────────────────────────────────────────────────
    const totalPending = useMemo(() => tenants.reduce((s, t) => s + t.dueAmount, 0), [tenants]);
    const partialPaid  = useMemo(() => tenants.filter(t => t.paidAmount > 0).reduce((s, t) => s + t.paidAmount, 0), [tenants]);

    // ── Sorted list (Overdue first, then by due amount descending) ───────────
    const sortedTenants = useMemo(() => {
        return [...tenants].sort((a, b) => {
            // Overdue first
            if (a.isOverdue && !b.isOverdue) return -1;
            if (!a.isOverdue && b.isOverdue) return 1;
            // Then by due amount descending
            return b.dueAmount - a.dueAmount;
        });
    }, [tenants]);

    // ── Handlers ────────────────────────────────────────────────────────────
    const handleRemind  = useCallback((t: DueTenant) => setRemindTarget(t), []);
    const handleCollect = useCallback((t: DueTenant) => {
        setSelectedFee(t);
        setPayAmount(t.dueAmount.toString());
        setPayNotes(''); setPayTransactionId('');
        setPayDate(toLocalDateStr(new Date()));
        const next = new Date(); next.setMonth(next.getMonth() + 1);
        setPayDueDate(toLocalDateStr(next));
        setCollectModalVisible(true);
    }, []);

    const handleCollectRent = useCallback(async () => {
        if (!payAmount || parseFloat(payAmount) <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount'); return;
        }
        if (!selectedFee) return;

        try {
            setPayLoading(true);
            const payload: any = {
                student_id: selectedFee.id,
                hostel_id: selectedFee.hostel_id,
                amount: parseFloat(payAmount),
                payment_date: payDate,
                due_date: payDueDate,
                payment_mode_id: parseInt(payModeId || '1'),
                notes: payNotes || null,
                transaction_id: payTransactionId || null,
                fee_month: selectedFee.feeMonth,
            };

            const res = await api.post('/monthly-fees/record-payment', payload);

            if (res.data.success) {
                setCollectModalVisible(false);
                Toast.show({
                    type: 'success',
                    text1: '✓ Payment Collected!',
                    text2: `₹${payAmount} recorded for ${selectedFee.name}`,
                });
                setTimeout(() => load(true), 500);
            } else {
                Alert.alert('Error', res.data.error || 'Payment was not saved.');
            }
        } catch (e: any) {
            const errData = e.response?.data;
            const errDetail = errData?.details || errData?.error || e.message;
            console.error('Collect error:', errData || e.message);
            Alert.alert('Payment Failed', errDetail || 'Could not record payment. Try again.');
        } finally {
            setPayLoading(false);
        }
    }, [payAmount, payDate, payModeId, payNotes, payTransactionId, payDueDate, selectedFee, load]);

    const keyExtractor  = useCallback((item: DueTenant) => `due-${item.id}`, []);
    const renderItem    = useCallback(({ item }: { item: DueTenant }) => (
        <TenantDueCard item={item} themeColor={theme.primary} onRemind={handleRemind} onCollect={handleCollect} />
    ), [theme.primary, handleRemind, handleCollect]);

    // ── Skeleton ─────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={s.root}>
                <StatusBar barStyle="light-content" />
                <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={s.header}>
                    <View style={s.headerRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.headerTitle}>Pending Dues</Text>
                            <Text style={s.headerSub}>Loading dues...</Text>
                        </View>
                        <View style={s.headerActions}>
                            <HeaderNotification navigation={navigation} />
                            <ProfileMenu />
                        </View>
                    </View>
                </LinearGradient>
                <View style={{ padding: 16, gap: 12 }}>
                    {[1, 2, 3].map(i => (
                        <View key={i} style={{ height: 140, backgroundColor: '#EDE9FE', borderRadius: 16, opacity: 0.5 }} />
                    ))}
                </View>
            </View>
        );
    }

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" />

            {/* ── Header ── */}
            <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={s.header}>
                <View style={s.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.headerTitle}>Pending Dues</Text>
                        <Text style={s.headerSub}>
                            {sortedTenants.length} tenant{sortedTenants.length !== 1 ? 's' : ''} with outstanding balance
                        </Text>
                    </View>
                    <View style={s.headerActions}>
                        <HeaderNotification navigation={navigation} />
                        <ProfileMenu />
                    </View>
                </View>

                {/* Embedded Summary Row inside Header */}
                <View style={s.headerSummaryRow}>
                    <View style={s.headerSummaryItem}>
                        <View style={[s.summaryDot, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                            <Ionicons name="alert-circle" size={14} color="#FCA5A5" />
                        </View>
                        <View style={s.summaryTextCol}>
                            <Text style={s.summaryItemLabel}>Pending</Text>
                            <Text style={s.summaryItemValue}>₹{totalPending.toLocaleString('en-IN')}</Text>
                        </View>
                    </View>
                    <View style={s.headerSummaryItem}>
                        <View style={[s.summaryDot, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                            <Ionicons name="checkmark-circle" size={14} color="#86EFAC" />
                        </View>
                        <View style={s.summaryTextCol}>
                            <Text style={s.summaryItemLabel}>Partial Paid</Text>
                            <Text style={s.summaryItemValue}>₹{partialPaid.toLocaleString('en-IN')}</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {/* ── List ── */}
            {sortedTenants.length === 0 ? (
                <View style={s.emptyWrap}>
                    <Text style={{ fontSize: 52, marginBottom: 12 }}>🎉</Text>
                    <Text style={s.emptyTitle}>All Clear!</Text>
                    <Text style={s.emptySub}>No pending payments found</Text>
                </View>
            ) : (
                <FlatList
                    data={sortedTenants}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    contentContainerStyle={s.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); load(true); }}
                            tintColor="#7C3AED"
                        />
                    }
                />
            )}

            {/* ── Remind modal ── */}
            <RemindModal
                visible={!!remindTarget}
                tenant={remindTarget}
                onClose={() => setRemindTarget(null)}
            />

            {/* ── Collect drawer (shared PaymentDrawer component) ── */}
            <PaymentDrawer
                visible={collectModalVisible}
                onClose={() => setCollectModalVisible(false)}
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

// ─── Card styles ──────────────────────────────────────────────────────────────
const tc = StyleSheet.create({
    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        marginHorizontal: 16,
        marginBottom: 12,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#7C3AED',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        borderWidth: 1.2,
        borderColor: '#EDE9FE',
        flexDirection: 'row',
    },
    accentBar: {
        width: 5,
    },
    inner: { padding: 16, flex: 1 },
    rowHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarTxt: { fontSize: 18, fontWeight: '900' },
    infoCol: { flex: 1 },
    name: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 2 },
    roomText: { fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 4 },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    statusText: { fontSize: 10, fontWeight: '800' },
    
    amountCol: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    amountLabel: { fontSize: 9, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    amountVal: { fontSize: 18, fontWeight: '900' },

    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 12,
    },

    actions: {
        flexDirection: 'row',
        gap: 10,
    },
    remindBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 9,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
    },
    remindText: { fontSize: 12, fontWeight: '600', color: '#475569' },
    collectBtn: {
        flex: 1.2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 9,
        borderRadius: 10,
    },
    collectText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
});

// ─── Remind Modal styles ──────────────────────────────────────────────────────
const rm = StyleSheet.create({
    backdrop: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 36,
    },
    handle: {
        width: 36, height: 4, borderRadius: 2,
        backgroundColor: '#CBD5E1',
        alignSelf: 'center', marginTop: 12, marginBottom: 16,
    },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 20, marginBottom: 8,
    },
    avatarCircle: {
        width: 46, height: 46, borderRadius: 23,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 18, fontWeight: '900' },
    tenantName: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
    tenantRoom: { fontSize: 12, color: '#64748B', fontWeight: '600' },
    closeBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#F1F5F9',
        alignItems: 'center', justifyContent: 'center',
    },
    subtitle: {
        fontSize: 12, color: '#94A3B8', fontWeight: '600',
        paddingHorizontal: 20, marginBottom: 12, marginTop: 8,
    },
    option: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    },
    optionIcon: {
        width: 46, height: 46, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
    },
    optionLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
    optionSub: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
    spacer: { height: 8 },
});

// ─── Main Screen styles ───────────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F3F0FA' },

    header: {
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFF' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 2 },
    headerActions: { flexDirection: 'row', gap: 12 },
    headerSummaryRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 15,
    },
    headerSummaryItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
        borderRadius: 14,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    summaryDot: {
        width: 26,
        height: 26,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryTextCol: {
        marginLeft: 8,
        flex: 1,
    },
    summaryItemLabel: {
        fontSize: 9,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    summaryItemValue: {
        fontSize: 13,
        color: '#FFF',
        fontWeight: '800',
        marginTop: 1,
    },

    listContent: { paddingTop: 16, paddingBottom: 110 },

    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
    emptySub: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
});

const S = StyleSheet.create({
    modalRoot: { flex: 1 },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 0 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', zIndex: 1 },
    drawerContent: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 0, maxHeight: '90%' },
    drawerHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
    drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    drawerTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
    infoSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, backgroundColor: '#F8FAFC', padding: 14, borderRadius: 14 },
    summaryName: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
    summaryRoom: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
    summaryAmtBox: { alignItems: 'flex-end' },
    summaryAmtLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 2 },
    summaryAmt: { fontSize: 20, fontWeight: '900', color: '#EF4444' },
    label: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 6, marginTop: 12 },
    inputField: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 13, fontSize: 15, color: '#1E293B', fontWeight: '600' },
    row: { flexDirection: 'row' },
    dateField: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, gap: 8 },
    dateTextLabel: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
    modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    modeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF' },
    modeText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
    submitBtn: { height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', minHeight: 52 },
    submitLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    submitBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14, letterSpacing: 0.8 },
});
