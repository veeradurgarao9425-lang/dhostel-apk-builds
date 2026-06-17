import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, StatusBar,
    FlatList, TextInput, Linking, Modal, ScrollView,
    RefreshControl, ActivityIndicator, Animated, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { X, Calendar } from 'lucide-react-native';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import api from '../services/api';
import Toast from 'react-native-toast-message';
import { HeaderNotification } from '../components/HeaderNotification';
import { ProfileMenu } from '../components/ProfileMenu';
import { useTheme } from '../../contexts/ThemeContext';

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

// FIX: Local date string — avoids IST timezone shift from toISOString()
function toLocalDateStr(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

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

// ─────────────────────────────────────────────────────────────────────────────
//  COLLECT DRAWER
// ─────────────────────────────────────────────────────────────────────────────
const CollectDrawer = React.memo(({
    visible, onClose, selectedFee, paymentModes,
    payAmount, setPayAmount, payNotes, setPayNotes,
    payTransactionId, setPayTransactionId,
    payDate, setPayDate, payDueDate, setPayDueDate,
    payModeId, setPayModeId, payLoading,
    onConfirm, themeColor,
}: any) => {
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [isDueDatePickerVisible, setDueDatePickerVisibility] = useState(false);

    React.useEffect(() => {
        Animated.timing(backdropOpacity, {
            toValue: visible ? 1 : 0,
            duration: visible ? 220 : 160,
            delay: visible ? 80 : 0,
            useNativeDriver: true,
        }).start();
    }, [visible]);

    const handleConfirmDate = (d: Date) => { setPayDate(toLocalDateStr(d)); setDatePickerVisibility(false); };
    const handleConfirmDueDate = (d: Date) => { setPayDueDate(toLocalDateStr(d)); setDueDatePickerVisibility(false); };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={S.modalRoot}>
                <Animated.View style={[S.modalBackdrop, { opacity: backdropOpacity }]} />
                <View style={S.modalOverlay}>
                    <View style={S.drawerContent}>
                        <View style={S.drawerHandle} />
                        <View style={S.drawerHeader}>
                            <Text style={S.drawerTitle}>Record Payment</Text>
                            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <X color="#64748B" size={20} />
                            </TouchableOpacity>
                        </View>

                        {selectedFee && (
                            <View style={S.infoSummary}>
                                <View>
                                    <Text style={S.summaryName}>{selectedFee.first_name} {selectedFee.last_name}</Text>
                                    <Text style={S.summaryRoom}>Room {selectedFee.room_number}</Text>
                                </View>
                                <View style={S.summaryAmtBox}>
                                    <Text style={S.summaryAmtLabel}>DUE</Text>
                                    <Text style={S.summaryAmt}>₹{payAmount}</Text>
                                </View>
                            </View>
                        )}

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <Text style={S.label}>Amount (₹) *</Text>
                            <TextInput style={S.inputField} keyboardType="numeric" value={payAmount} onChangeText={setPayAmount} />

                            <View style={S.row}>
                                <View style={{ flex: 1, marginRight: 6 }}>
                                    <Text style={S.label}>Payment Date *</Text>
                                    <TouchableOpacity style={S.dateField} onPress={() => setDatePickerVisibility(true)}>
                                        <Calendar size={14} color="#64748B" />
                                        <Text style={S.dateTextLabel}>{payDate}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={{ flex: 1, marginLeft: 6 }}>
                                    <Text style={S.label}>Due Date *</Text>
                                    <TouchableOpacity style={S.dateField} onPress={() => setDueDatePickerVisibility(true)}>
                                        <Calendar size={14} color="#64748B" />
                                        <Text style={S.dateTextLabel}>{payDueDate}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Text style={S.label}>Payment Mode</Text>
                            <View style={S.modeRow}>
                                {paymentModes.map((m: any) => {
                                    const mId = (m.payment_mode_id || m.id)?.toString();
                                    const mName = m.payment_mode_name || m.name || 'Cash';
                                    const active = payModeId === mId;
                                    return (
                                        <TouchableOpacity key={mId}
                                            style={[S.modeChip, active && { backgroundColor: themeColor, borderColor: themeColor }]}
                                            onPress={() => setPayModeId(mId)}>
                                            <Text style={[S.modeText, active && { color: '#FFF' }]}>{mName}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={S.label}>Transaction ID (Optional)</Text>
                            <TextInput style={S.inputField} value={payTransactionId}
                                onChangeText={setPayTransactionId} placeholder="e.g. UPI-123456" />

                            <Text style={S.label}>Notes</Text>
                            <TextInput style={[S.inputField, { height: 64, textAlignVertical: 'top' }]}
                                value={payNotes} onChangeText={setPayNotes} multiline placeholder="Any remarks..." />

                            <View style={{ height: 14 }} />
                            <TouchableOpacity
                                style={[S.submitBtn, { backgroundColor: themeColor }, payLoading && { opacity: 0.6 }]}
                                onPress={onConfirm} disabled={payLoading}>
                                {payLoading ? (
                                    <View style={S.submitLoadingRow}>
                                        <ActivityIndicator color="#FFF" size="small" />
                                        <Text style={S.submitBtnText}>Processing...</Text>
                                    </View>
                                ) : (
                                    <Text style={S.submitBtnText}>CONFIRM PAYMENT</Text>
                                )}
                            </TouchableOpacity>
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </View>
            </View>

            <DateTimePickerModal isVisible={isDatePickerVisible} mode="date"
                onConfirm={handleConfirmDate} onCancel={() => setDatePickerVisibility(false)} date={new Date(payDate)} />
            <DateTimePickerModal isVisible={isDueDatePickerVisible} mode="date"
                onConfirm={handleConfirmDueDate} onCancel={() => setDueDatePickerVisibility(false)} date={new Date(payDueDate)} />
        </Modal>
    );
});


// ─── Tenant Card ──────────────────────────────────────────────────────────────
const TenantDueCard = React.memo(({ item, onRemind, onCollect }: {
    item: DueTenant;
    onRemind: (t: DueTenant) => void;
    onCollect: (t: DueTenant) => void;
}) => {
    const paidPct = item.totalAmount > 0
        ? Math.min(100, Math.round((item.paidAmount / item.totalAmount) * 100))
        : 0;

    const accentColor = item.isOverdue ? '#DC2626' : '#D97706';
    const accentBg    = item.isOverdue ? '#FEE2E2' : '#FEF3C7';
    const tagLabel    = item.isOverdue
        ? `${item.daysOverdue}d overdue`
        : `Due: ${item.dueDate}`;

    return (
        <View style={tc.card}>
            {/* Left accent strip */}
            <View style={[tc.strip, { backgroundColor: accentColor }]} />

            <View style={tc.inner}>
                {/* Row 1: Avatar + Name + Status tag */}
                <View style={tc.row1}>
                    <View style={[tc.avatar, { backgroundColor: avatarColor(item.name) + '18' }]}>
                        <Text style={[tc.avatarTxt, { color: avatarColor(item.name) }]}>
                            {item.name[0].toUpperCase()}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={tc.name}>{item.name}</Text>
                        <View style={tc.meta}>
                            <View style={tc.roomPill}>
                                <Ionicons name="bed-outline" size={10} color="#7C3AED" />
                                <Text style={tc.roomText}>Room {item.room}</Text>
                            </View>
                            <View style={[tc.statusPill, { backgroundColor: accentBg }]}>
                                <Ionicons name="time-outline" size={10} color={accentColor} />
                                <Text style={[tc.statusText, { color: accentColor }]}>{tagLabel}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Row 2: Amounts (Total | Paid | Due) */}
                <View style={tc.amounts}>
                    <View style={tc.amountCell}>
                        <Text style={tc.amountLabel}>Total</Text>
                        <Text style={tc.amountVal}>₹{item.totalAmount.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={tc.amountDivider} />
                    <View style={tc.amountCell}>
                        <Text style={[tc.amountLabel, { color: '#16A34A' }]}>Paid ✓</Text>
                        <Text style={[tc.amountVal, { color: '#16A34A' }]}>₹{item.paidAmount.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={tc.amountDivider} />
                    <View style={tc.amountCell}>
                        <Text style={[tc.amountLabel, { color: accentColor }]}>Due ⚠</Text>
                        <Text style={[tc.amountVal, { color: accentColor, fontWeight: '900' }]}>₹{item.dueAmount.toLocaleString('en-IN')}</Text>
                    </View>
                </View>

                {/* Progress bar */}
                {item.totalAmount > 0 && (
                    <View style={tc.progressRow}>
                        <View style={tc.progressBg}>
                            <View style={[tc.progressFill, { width: `${paidPct}%` as any, backgroundColor: paidPct > 0 ? '#16A34A' : '#E2E8F0' }]} />
                        </View>
                        <Text style={tc.progressLabel}>{paidPct}% paid</Text>
                    </View>
                )}

                {/* Month chip */}
                {item.feeMonth && (
                    <Text style={tc.monthChip}>📅 {item.feeMonth}</Text>
                )}

                {/* Action buttons */}
                <View style={tc.actions}>
                    <TouchableOpacity
                        style={tc.remindBtn}
                        onPress={() => onRemind(item)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="notifications-outline" size={15} color="#7C3AED" />
                        <Text style={tc.remindText}>Remind</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={tc.collectBtn}
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
    const [search, setSearch]       = useState('');
    const [sort, setSort]           = useState<SortType>('amount');
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

    // ── Filtered + sorted list ───────────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        let list = q
            ? tenants.filter(t =>
                t.name.toLowerCase().includes(q) ||
                t.room.toLowerCase().includes(q))
            : tenants;

        if (sort === 'amount')  list = [...list].sort((a, b) => b.dueAmount - a.dueAmount);
        if (sort === 'room')    list = [...list].sort((a, b) => a.room.localeCompare(b.room));
        if (sort === 'overdue') list = [...list].sort((a, b) => b.daysOverdue - a.daysOverdue);
        return list;
    }, [tenants, search, sort]);

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
        <TenantDueCard item={item} onRemind={handleRemind} onCollect={handleCollect} />
    ), [handleRemind, handleCollect]);

    // ── Skeleton ─────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={s.root}>
                <StatusBar barStyle="light-content" />
                <LinearGradient colors={['#5B21B6', '#7C3AED']} style={s.header}>
                    <View style={s.headerRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.headerTitle}>Pending Payments</Text>
                            <Text style={s.headerSub}>Loading...</Text>
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
            <LinearGradient colors={['#5B21B6', '#7C3AED']} style={s.header}>
                <View style={s.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.headerTitle}>Pending Payments</Text>
                        <Text style={s.headerSub}>
                            {filtered.length} tenant{filtered.length !== 1 ? 's' : ''} pending
                        </Text>
                    </View>
                    <View style={s.headerActions}>
                        <HeaderNotification navigation={navigation} />
                        <ProfileMenu />
                    </View>
                </View>
            </LinearGradient>

            {/* ── Summary cards ── */}
            <View style={s.summaryRow}>
                <View style={[s.summaryCard, { borderLeftColor: '#DC2626' }]}>
                    <View style={[s.summaryIcon, { backgroundColor: '#FEE2E2' }]}>
                        <Ionicons name="time-outline" size={18} color="#DC2626" />
                    </View>
                    <View>
                        <Text style={s.summaryLabel}>Total Pending</Text>
                        <Text style={[s.summaryAmount, { color: '#DC2626' }]}>
                            ₹{totalPending.toLocaleString('en-IN')}
                        </Text>
                    </View>
                </View>
                <View style={[s.summaryCard, { borderLeftColor: '#16A34A' }]}>
                    <View style={[s.summaryIcon, { backgroundColor: '#DCFCE7' }]}>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#16A34A" />
                    </View>
                    <View>
                        <Text style={s.summaryLabel}>Partial Paid</Text>
                        <Text style={[s.summaryAmount, { color: '#16A34A' }]}>
                            ₹{partialPaid.toLocaleString('en-IN')}
                        </Text>
                    </View>
                </View>
            </View>

            {/* ── Search ── */}
            <View style={s.searchWrap}>
                <Ionicons name="search-outline" size={16} color="#94A3B8" />
                <TextInput
                    style={s.searchInput}
                    placeholder="Search by name or room..."
                    placeholderTextColor="#94A3B8"
                    value={search}
                    onChangeText={setSearch}
                    autoCorrect={false}
                    autoCapitalize="none"
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                )}
            </View>

            {/* ── Sort chips ── */}
            <View style={s.sortRow}>
                {([
                    { key: 'amount',  label: 'By Amount',  icon: 'trending-down-outline' },
                    { key: 'overdue', label: 'Overdue First', icon: 'alert-circle-outline' },
                    { key: 'room',    label: 'By Room',    icon: 'bed-outline' },
                ] as const).map(opt => (
                    <TouchableOpacity
                        key={opt.key}
                        style={[s.sortChip, sort === opt.key && s.sortChipActive]}
                        onPress={() => setSort(opt.key)}
                    >
                        <Ionicons
                            name={opt.icon as any}
                            size={12}
                            color={sort === opt.key ? '#7C3AED' : '#94A3B8'}
                        />
                        <Text style={[s.sortChipText, sort === opt.key && { color: '#7C3AED', fontWeight: '700' }]}>
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ── List ── */}
            {filtered.length === 0 ? (
                <View style={s.emptyWrap}>
                    <Text style={{ fontSize: 52, marginBottom: 12 }}>🎉</Text>
                    <Text style={s.emptyTitle}>All Clear!</Text>
                    <Text style={s.emptySub}>No pending payments found</Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
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

            {/* ── Collect drawer ── */}
            <CollectDrawer
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
        borderRadius: 18,
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#7C3AED',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    strip: { width: 5 },
    inner: { flex: 1, padding: 14 },

    row1: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarTxt: { fontSize: 18, fontWeight: '900' },
    name: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 5 },
    meta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    roomPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#EDE9FE',
        borderRadius: 8,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    roomText: { fontSize: 10, fontWeight: '700', color: '#7C3AED' },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        borderRadius: 8,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    statusText: { fontSize: 10, fontWeight: '700' },

    amounts: {
        flexDirection: 'row',
        backgroundColor: '#F8F7FF',
        borderRadius: 12,
        padding: 10,
        marginBottom: 10,
    },
    amountCell: { flex: 1, alignItems: 'center' },
    amountLabel: { fontSize: 10, color: '#64748B', fontWeight: '600', marginBottom: 3 },
    amountVal: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
    amountDivider: { width: 1, backgroundColor: '#E2E8F0', marginVertical: 4 },

    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    progressBg: { flex: 1, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2 },
    progressLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', minWidth: 45 },

    monthChip: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginBottom: 10 },

    actions: { flexDirection: 'row', gap: 10 },
    remindBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#7C3AED',
        backgroundColor: '#FFF',
    },
    remindText: { fontSize: 13, fontWeight: '700', color: '#7C3AED' },
    collectBtn: {
        flex: 1.2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#16A34A',
    },
    collectText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
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
    root: { flex: 1, backgroundColor: '#F8F7FF' },

    header: {
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 25,
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

    summaryRow: {
        flexDirection: 'row', gap: 12,
        paddingHorizontal: 16, paddingVertical: 14,
    },
    summaryCard: {
        flex: 1, backgroundColor: '#FFF',
        borderRadius: 16, padding: 14,
        flexDirection: 'row', alignItems: 'center', gap: 10,
        borderLeftWidth: 4,
        elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    },
    summaryIcon: {
        width: 38, height: 38, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
    },
    summaryLabel: { fontSize: 10, color: '#64748B', fontWeight: '600', marginBottom: 3 },
    summaryAmount: { fontSize: 16, fontWeight: '900' },

    searchWrap: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#FFF', borderRadius: 14,
        marginHorizontal: 16, paddingHorizontal: 12, paddingVertical: 10,
        elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4,
        borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 10,
    },
    searchInput: { flex: 1, fontSize: 13, color: '#1E293B', fontWeight: '500' },

    sortRow: {
        flexDirection: 'row', gap: 8,
        paddingHorizontal: 16, marginBottom: 10,
    },
    sortChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#FFF', borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 6,
        borderWidth: 1, borderColor: '#E2E8F0',
    },
    sortChipActive: {
        backgroundColor: '#EDE9FE', borderColor: '#7C3AED',
    },
    sortChipText: { fontSize: 10, fontWeight: '600', color: '#94A3B8' },

    listContent: { paddingTop: 4, paddingBottom: 110 },

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
