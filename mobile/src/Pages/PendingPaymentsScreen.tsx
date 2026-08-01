import React, { useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, StatusBar,
    FlatList, Linking, Modal, Image, ImageBackground,
    RefreshControl, ActivityIndicator, Alert, TextInput,
    Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import { HeaderNotification } from '../components/HeaderNotification';
import { ProfileMenu } from '../components/ProfileMenu';
import { PaymentDrawer } from '../components/PaymentDrawer';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import { useRefresh } from '../../contexts/RefreshContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../context/ToastContext';
import { toLocalDateStr } from '../utils/dateUtils';
import { AppHeader } from '../components/AppHeader';
import { useTranslation } from 'react-i18next';
import { FilterDuesModal } from '../components/FilterDuesModal';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadMoreFooter } from '../components/ui/LoadMoreFooter';

const { width } = Dimensions.get('window');

// ─── Types ───────────────────────────────────────────────────────────────────
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
    rawDueDate: string;
    daysOverdue: number;
    isOverdue: boolean;
    status: string;
    carryForward: number;
    monthlyRent: number;
    breakdown?: { month: string; amount: number; dueDate: string }[];
}

const sf = (v: any): number => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

// ─── Avatar palette ───────────────────────────────────────────────────────────
const AVATAR_PALETTES = [
    { bg: '#EDE9FE', text: '#7C3AED' },
    { bg: '#DBEAFE', text: '#2563EB' },
    { bg: '#FEE2E2', text: '#DC2626' },
    { bg: '#FEF3C7', text: '#D97706' },
    { bg: '#DCFCE7', text: '#059669' },
    { bg: '#E0F2FE', text: '#0891B2' },
];
const avatarPalette = (name: string) => AVATAR_PALETTES[name.charCodeAt(0) % AVATAR_PALETTES.length];

// ─── Remind Modal ─────────────────────────────────────────────────────────────
const RemindModal = ({ visible, tenant, onClose }: {
    visible: boolean;
    tenant: DueTenant | null;
    onClose: () => void;
}) => {
    const { showError } = useToast();
    const { t } = useTranslation();
    const { theme, isDark } = useTheme();

    if (!tenant) return null;

    const palette = avatarPalette(tenant.name);

    const callTenant = () => {
        onClose();
        if (!tenant.phone) { showError(t('pendingDues.noPhoneAvailable', 'No phone number available')); return; }
        Linking.openURL(`tel:${tenant.phone}`);
    };

    const whatsappRemind = () => {
        onClose();
        if (!tenant.phone) { showError(t('pendingDues.noPhoneAvailable', 'No phone number available')); return; }
        const msg = t('pendingDues.verificationMsg', {
            name: tenant.name.split(' ')[0],
            amount: tenant.dueAmount.toLocaleString('en-IN'),
            month: tenant.feeMonth,
        });
        Linking.openURL(`whatsapp://send?phone=91${tenant.phone}&text=${encodeURIComponent(msg)}`);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity style={rm.backdrop} activeOpacity={1} onPress={onClose} />
            <View style={[rm.sheet, { backgroundColor: theme.cardBg }]}>
                <View style={[rm.handle, { backgroundColor: isDark ? '#475569' : '#CBD5E1' }]} />
                <View style={rm.header}>
                    <View style={[rm.avatarCircle, { backgroundColor: palette.bg }]}>
                        <Text style={[rm.avatarText, { color: palette.text }]}>
                            {tenant.name[0].toUpperCase()}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[rm.tenantName, { color: theme.textPrimary }]}>{tenant.name}</Text>
                        <Text style={[rm.tenantRoom, { color: theme.textSecondary }]}>
                            {t('rooms.room')} {tenant.room} · ₹{tenant.dueAmount.toLocaleString('en-IN')} {t('fees.pending').toLowerCase()}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={[rm.closeBtn, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                        <Ionicons name="close" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                </View>

                <Text style={[rm.subtitle, { color: theme.textSecondary }]}>{t('pendingDues.remindTenant')}</Text>

                <TouchableOpacity style={[rm.option, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]} onPress={callTenant} activeOpacity={0.8}>
                    <View style={[rm.optionIcon, { backgroundColor: isDark ? '#14532D' : '#DCFCE7' }]}>
                        <Ionicons name="call" size={22} color="#16A34A" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[rm.optionLabel, { color: theme.textPrimary }]}>{t('pendingDues.callTenant')}</Text>
                        <Text style={[rm.optionSub, { color: theme.textSecondary }]}>{t('pendingDues.directlyDial', { phone: tenant.phone || '' })}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={isDark ? '#475569' : '#CBD5E1'} />
                </TouchableOpacity>

                <TouchableOpacity style={[rm.option, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]} onPress={whatsappRemind} activeOpacity={0.8}>
                    <View style={[rm.optionIcon, { backgroundColor: isDark ? '#14532D' : '#DCFCE7' }]}>
                        <Ionicons name="logo-whatsapp" size={22} color="#22C55E" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[rm.optionLabel, { color: theme.textPrimary }]}>{t('pendingDues.whatsappReminder')}</Text>
                        <Text style={[rm.optionSub, { color: theme.textSecondary }]}>{t('pendingDues.sendPaymentReminder')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={isDark ? '#475569' : '#CBD5E1'} />
                </TouchableOpacity>

                <View style={{ height: 32 }} />
            </View>
        </Modal>
    );
};

// ─── Tenant Due Card (simplified: 2-line info + optional carry-forward note + labeled actions) ──
const TenantDueCard = React.memo(({ item, themeColor, onRemind, onCollect, isDark, theme, fontSize }: {
    item: DueTenant;
    themeColor: string;
    onRemind: (t: DueTenant) => void;
    onCollect: (t: DueTenant) => void;
    isDark: boolean;
    theme: any;
    fontSize: number;
}) => {
    const palette = avatarPalette(item.name);
    const accentColor = item.isOverdue ? '#DC2626' : '#D97706';
    let tagLabel = '';
    if (item.isOverdue) {
        tagLabel = `${item.daysOverdue}d overdue`;
    } else {
        const dueObj = new Date(item.rawDueDate);
        dueObj.setHours(0, 0, 0, 0);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((dueObj.getTime() - now.getTime()) / 86400000);

        if (diffDays === 0) tagLabel = 'Due Today';
        else if (diffDays === 1) tagLabel = 'Due Tomorrow';
        else if (diffDays > 1) tagLabel = `Due in ${diffDays} days`;
        else tagLabel = `Due ${item.dueDate}`;
    }

    const isDarkBg = isDark ? '#1E293B' : '#FFF';

    return (
        <View style={[card.wrap, {
            backgroundColor: isDarkBg,
            borderColor: item.isOverdue ? '#FECACA' : (isDark ? '#334155' : '#ECECEC'),
            borderWidth: item.isOverdue ? 1.5 : 1,
            shadowColor: '#000',
        }]}>
            {/* Left accent bar */}
            <View style={[card.accentBar, { backgroundColor: accentColor }]} />

            <View style={card.body}>
                {/* ── Top row: Avatar | Name+Room · Status | Amount ── */}
                <View style={card.topRow}>
                    <View style={[card.avatar, { backgroundColor: palette.bg }]}>
                        <Text style={[card.avatarTxt, { color: palette.text }]}>
                            {item.name[0].toUpperCase()}
                        </Text>
                    </View>

                    <View style={card.infoCol}>
                        <Text style={[card.name, { color: isDark ? '#F8FAFC' : '#1F2937', fontSize: fontSize + 1 }]} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <Text style={[card.roomTxt, { color: accentColor, fontSize: fontSize - 2 }]} numberOfLines={1}>
                            Room {item.room} · {tagLabel}
                        </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[card.amountBig, { color: accentColor, fontSize: fontSize + 3 }]} numberOfLines={1}>
                            ₹{item.dueAmount.toLocaleString('en-IN')}
                        </Text>
                        {item.paidAmount > 0 && (
                            <Text style={{ fontSize: 10, color: '#10B981', marginTop: 2, fontWeight: '600' }}>Paid ₹{item.paidAmount}</Text>
                        )}
                    </View>
                </View>

                {/* ── Carry-forward badge: prominent amber pill so owner notices unpaid history ── */}
                {item.carryForward > 0 && (
                    <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 5,
                        backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 10,
                        paddingVertical: 5, marginBottom: 8, borderWidth: 1, borderColor: '#FCD34D',
                        alignSelf: 'flex-start',
                    }}>
                        <Ionicons name="warning-outline" size={12} color="#D97706" />
                        <Text style={{ color: '#92400E', fontSize: 11, fontWeight: '700' }}>
                            ₹{item.carryForward.toLocaleString('en-IN')} carry-forward from last month
                        </Text>
                    </View>
                )}

                {/* ── Divider ── */}
                <View style={[card.divider, { backgroundColor: isDark ? '#334155' : '#ECECEC' }]} />

                {/* ── Actions: full-width labeled buttons ── */}
                <View style={card.actionsRow}>
                    <TouchableOpacity
                        style={[card.actionBtn, { borderColor: theme.primary, borderWidth: 1.5, backgroundColor: 'transparent' }]}
                        onPress={() => onRemind(item)}
                        activeOpacity={0.75}
                    >
                        <Ionicons name="notifications-outline" size={16} color={theme.primary} />
                        <Text style={[card.actionBtnText, { color: theme.primary }]}>Remind</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[card.actionBtn, { backgroundColor: theme.primary }]}
                        onPress={() => onCollect(item)}
                        activeOpacity={0.75}
                    >
                        <MaterialCommunityIcons name="currency-inr" size={16} color="#FFFFFF" />
                        <Text style={[card.actionBtnText, { color: '#FFFFFF' }]}>Collect</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
});

// ─── Wave SVG decoration (pure View-based) ────────────────────────────────────
const WaveDecoration = ({ color }: { color: string }) => (
    <View style={wave.container} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none">
            {/* Background wave */}
            <Path
                d="M0,40 Q25,5 55,20 T100,5 L100,40 Z"
                fill={color}
                opacity={0.08}
            />
            {/* Foreground wave */}
            <Path
                d="M0,40 Q30,20 60,30 T100,15 L100,40 Z"
                fill={color}
                opacity={0.12}
            />
        </Svg>
    </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PendingPaymentsScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { theme, fontSize, isDark } = useTheme();
    const { t } = useTranslation();
    const { showSuccess, showError, showApiError } = useToast();
    const insets = useSafeAreaInsets();

    const [tenants, setTenants] = useState<DueTenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [remindTarget, setRemindTarget] = useState<DueTenant | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [activeFilters, setActiveFilters] = useState<any>({ 
        status: 'All', 
        datePreset: route.params?.datePreset || 'All Time', 
        room: 'All', 
        sortBy: 'Due Date - Old to New' 
    });
    // Store filters in a ref so the load callback always has the latest value
    const activeFiltersRef = useRef<any>({
        status: 'All',
        datePreset: route.params?.datePreset || 'All Time',
        room: 'All',
        sortBy: 'Due Date - Old to New'
    });
    const handleApplyFilters = (filters: any) => {
        setFilterModalVisible(false);
        activeFiltersRef.current = filters;
        setActiveFilters(filters);
        setPage(1);
        setHasMore(true);
        setTenants([]);
        load(1, false);
    };
    const handleClearFilters = () => {
        const cleared = { status: 'All', datePreset: 'All Time', room: 'All', sortBy: 'Due Date - Old to New' };
        activeFiltersRef.current = cleared;
        setActiveFilters(cleared);
        setPage(1);
        setHasMore(true);
        setTenants([]);
        load(1, false);
    };
    const [totalPending, setTotalPending] = useState(0);
    const [partialPaid, setPartialPaid] = useState(0);
    const [totalDefaulters, setTotalDefaulters] = useState(0);

    const initialTab = (['Overdue', 'Next 7 Days', 'All Dues', 'Plan Renewals'] as const).includes(route.params?.tab)
        ? route.params.tab
        : 'Overdue';
    const [activeTab, setActiveTab] = useState<'Overdue' | 'Next 7 Days' | 'All Dues' | 'Plan Renewals'>(initialTab);
    const [tabCounts, setTabCounts] = useState({
        overdue: 0, next_7_days: 0, all: 0,
        overdue_amount: 0, next_7_days_amount: 0, all_amount: 0, partial_count: 0
    });

    // Plan Renewals state
    const [renewalStudents, setRenewalStudents] = useState<any[]>([]);
    const [renewalsLoading, setRenewalsLoading] = useState(false);

    // Collect Drawer
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

    // ── Fetch ────────────────────────────────────────────────────────────────
    const load = useCallback(async (pageNum = 1, isSilent = false) => {
        try {
            if (pageNum === 1) {
                if (!isSilent && isFirstLoadRef.current) setLoading(true);
                setError(false);
            } else {
                setLoadingMore(true);
            }

            if (!modesLoadedRef.current) {
                const modesRes = await api.get('/monthly-fees/payment-modes').catch(() => null);
                if (modesRes?.data?.success) {
                    const modes = modesRes.data.data;
                    setPaymentModes(modes);
                    const first = modes[0];
                    if (first) setPayModeId((first.payment_mode_id || first.id)?.toString() || '1');
                    modesLoadedRef.current = true;
                }
            }

            const res: any = await api.get('/monthly-fees/summary', {
                params: { onlyPending: 'true', page: pageNum, limit: 10 },
            });
            if (!res.data.success) throw new Error(res.data?.error || 'Failed to load dues');

            if (res.data.data?.tab_counts) {
                setTabCounts(res.data.data.tab_counts);
            }

            const fees: any[] = res.data.data?.fees || [];
            const now = new Date(); now.setHours(0, 0, 0, 0);

            const studentMap = new Map();

            fees.forEach(f => {
                // balance = total actually owed (current month + all unpaid carry_forward)
                // This is the REAL amount the student owes total
                const balance = sf(f.balance || 0);
                const paid = sf(f.paid_amount || f.amount_paid || 0);
                const totalDue = sf(f.total_due || 0); // current month fee only
                const carryForward = sf(f.carry_forward || 0); // from past unpaid months
                const monthlyRent = sf(f.monthly_rent || f.fee_monthly_rent || f.student_monthly_rent || 0);

                const dueDateObj = f.due_date ? new Date(f.due_date) : new Date();
                dueDateObj.setHours(0, 0, 0, 0);
                const diffDays = Math.floor((now.getTime() - dueDateObj.getTime()) / 86400000);

                const dueMonth = f.fee_month || f.month || '';
                const dueDateStr = f.due_date ? new Date(f.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';

                // Skip students with nothing owed
                if (balance <= 0) return;

                if (!studentMap.has(f.student_id)) {
                    studentMap.set(f.student_id, {
                        id: f.student_id,
                        name: `${f.first_name || ''} ${f.last_name || ''}`.trim(),
                        first_name: f.first_name || '',
                        last_name: f.last_name || '',
                        phone: f.phone || '',
                        room: f.room_number || 'N/A',
                        room_number: f.room_number || 'N/A',
                        hostel_id: f.hostel_id,
                        totalAmount: balance + paid,  // Total billed (Due + Paid)
                        paidAmount: paid,             // amount paid so far
                        dueAmount: balance,           // TOTAL actually owed (includes ALL past unpaid)
                        feeMonth: dueMonth,
                        dueDate: dueDateStr,
                        rawDueDate: f.due_date || new Date().toISOString(),
                        daysOverdue: Math.max(0, diffDays),
                        isOverdue: diffDays > 0,
                        status: f.fee_status || 'pending',
                        carryForward: carryForward,
                        monthlyRent: monthlyRent,
                        breakdown: []
                    });
                }

                const s = studentMap.get(f.student_id);

                // Build breakdown: if there's carry_forward, show it as past months
                if (carryForward > 0) {
                    s.breakdown.push({
                        month: 'Past unpaid months',
                        amount: carryForward,
                        dueDate: null,
                        isPast: true
                    });
                }
                if (monthlyRent > 0) {
                    s.breakdown.push({
                        month: dueMonth || 'Current month',
                        amount: monthlyRent,
                        dueDate: f.due_date,
                        isPast: false
                    });
                }
            });

            const pending: DueTenant[] = Array.from(studentMap.values()).map((s: any) => {
                s.displayMonth = s.feeMonth;
                return s;
            });

            setHasMore(res.data.data?.hasMore ?? (pending.length === 10));
            setTenants(prev => {
                if (pageNum === 1) return pending;
                const existingIds = new Set(prev.map(t => t.id));
                return [...prev, ...pending.filter(t => !existingIds.has(t.id))];
            });

            const summaryObj = res.data.data?.summary;
            if (summaryObj) {
                setTotalPending(summaryObj.total_pending || 0);
                setPartialPaid(summaryObj.partial_paid_sum || 0);
                setTotalDefaulters(summaryObj.pending || 0);
            }
        } catch (e: any) {
            showApiError(e, t('pendingDues.failedLoadDues'));
            if (pageNum === 1) setError(true);
        } finally {
            isFirstLoadRef.current = false;
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        setPage(1);
        setHasMore(true);
        load(1, false);
        // Also load plan renewals
        setRenewalsLoading(true);
        api.get('/students', { params: { renewalDueSoon: 'true', renewalDays: '15', status: 1 } })
            .then(res => {
                if (res.data?.success) setRenewalStudents(res.data.data || []);
            })
            .catch(() => {})
            .finally(() => setRenewalsLoading(false));
    }, [load]));

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleRemind = useCallback((t: DueTenant) => setRemindTarget(t), []);
    const handleCollect = useCallback((t: DueTenant) => {
        setSelectedFee(t);
        setPayAmount(t.dueAmount.toString());
        setPayNotes(''); setPayTransactionId('');
        setPayDate(toLocalDateStr(new Date()));

        // Keep the original due date by default so they remain in the Overdue tab on partial payments
        if (t.dueAmount > 0 && t.rawDueDate) {
            setPayDueDate(t.rawDueDate.split('T')[0]);
        } else {
            const next = new Date(); next.setMonth(next.getMonth() + 1);
            setPayDueDate(toLocalDateStr(next));
        }

        setCollectModalVisible(true);
    }, []);

    const handleCollectRent = useCallback(async () => {
        if (!payAmount || parseFloat(payAmount) <= 0) {
            showError('Please enter a valid amount'); return;
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
                showSuccess(`₹${payAmount} recorded for ${selectedFee.name}`, 'Payment Collected!');
                setTimeout(() => load(1, true), 500);
            } else {
                showError(res.data.error || 'Payment was not saved.');
            }
        } catch (e: any) {
            showApiError(e, 'Could not record payment. Try again.');
        } finally {
            setPayLoading(false);
        }
    }, [payAmount, payDate, payModeId, payNotes, payTransactionId, payDueDate, selectedFee, load, showSuccess, showError, showApiError]);

    // ── Filtered list ─────────────────────────────────────────────────────────
    const filteredTenants = tenants.filter(t => {
        // 1. Search filter
        if (searchQuery.trim()) {
            const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.room.toLowerCase().includes(searchQuery.toLowerCase());
            if (!matchesSearch) return false;
        }

        // 2. Status filter
        if (activeFilters.status !== 'All') {
            if (activeFilters.status === 'Partial' && t.paidAmount === 0) return false;
            if (activeFilters.status === 'Pending' && t.paidAmount > 0) return false;
        }

        // 3. Room filter
        if (activeFilters.room !== 'All') {
            if (activeFilters.room === 'Unallocated' && (t.room_number !== null && t.room !== 'N/A')) return false;
            if (activeFilters.room === 'Has Room' && (t.room_number === null || t.room === 'N/A')) return false;
            if (activeFilters.room !== 'Unallocated' && activeFilters.room !== 'Has Room' && t.room_number !== activeFilters.room) return false;
        }

        // 4. Date Filter
        if (activeFilters.datePreset !== 'All Time') {
            const dueDateObj = new Date(t.rawDueDate);
            dueDateObj.setHours(0, 0, 0, 0);

            const now = new Date();
            now.setHours(0, 0, 0, 0);

            const preset = activeFilters.datePreset;
            if (preset === 'Today') {
                if (dueDateObj.getTime() !== now.getTime()) return false;
            } else if (preset === 'Yesterday') {
                const yesterday = new Date(now);
                yesterday.setDate(now.getDate() - 1);
                if (dueDateObj.getTime() !== yesterday.getTime()) return false;
            } else if (preset === 'Last 30 Days') {
                const thirtyDaysAgo = new Date(now);
                thirtyDaysAgo.setDate(now.getDate() - 30);
                if (dueDateObj.getTime() < thirtyDaysAgo.getTime() || dueDateObj.getTime() > now.getTime()) return false;
            } else if (preset === 'Last 3 Months') {
                const ninetyDaysAgo = new Date(now);
                ninetyDaysAgo.setDate(now.getDate() - 90);
                if (dueDateObj.getTime() < ninetyDaysAgo.getTime() || dueDateObj.getTime() > now.getTime()) return false;
            } else if (preset === 'Last 6 Months') {
                const sixMonthsAgo = new Date(now);
                sixMonthsAgo.setDate(now.getDate() - 180);
                if (dueDateObj.getTime() < sixMonthsAgo.getTime() || dueDateObj.getTime() > now.getTime()) return false;
            } else if (preset === 'Last 12 Months') {
                const twelveMonthsAgo = new Date(now);
                twelveMonthsAgo.setDate(now.getDate() - 365);
                if (dueDateObj.getTime() < twelveMonthsAgo.getTime() || dueDateObj.getTime() > now.getTime()) return false;
            } else if (preset === 'Previous Month') {
                const prevMonth = new Date(now);
                prevMonth.setMonth(now.getMonth() - 1);
                if (dueDateObj.getMonth() !== prevMonth.getMonth() || dueDateObj.getFullYear() !== prevMonth.getFullYear()) return false;
            } else if (preset === 'Previous Year') {
                if (dueDateObj.getFullYear() !== (now.getFullYear() - 1)) return false;
            } else if (preset === 'Custom Date Range') {
                if (activeFilters.customStartDate) {
                    const startLimit = new Date(activeFilters.customStartDate);
                    startLimit.setHours(0, 0, 0, 0);
                    if (dueDateObj.getTime() < startLimit.getTime()) return false;
                }
                if (activeFilters.customEndDate) {
                    const endLimit = new Date(activeFilters.customEndDate);
                    endLimit.setHours(0, 0, 0, 0);
                    if (dueDateObj.getTime() > endLimit.getTime()) return false;
                }
            } else {
                // Check if it's the dynamic current month name (e.g. "July")
                const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });
                if (preset === currentMonthName) {
                    if (dueDateObj.getMonth() !== now.getMonth() || dueDateObj.getFullYear() !== now.getFullYear()) return false;
                }
            }
        }
        // 5. Tab Filter
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const dueObj = new Date(t.rawDueDate);
        dueObj.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((dueObj.getTime() - now.getTime()) / 86400000);

        if (activeTab === 'Overdue') {
            if (!t.isOverdue) return false;
        } else if (activeTab === 'Next 7 Days') {
            if (t.isOverdue || diffDays < 0 || diffDays > 7) return false;
        } else if (activeTab === 'All Dues') {
            return true;
        } else if (activeTab === 'Plan Renewals') {
            return false; // Renewals list is separate from the dues list
        }

        return true;
    }).sort((a, b) => {
        const order = activeFilters.sortBy || 'Due Date - Old to New';
        if (order === 'Due Date - Old to New') {
            return new Date(a.rawDueDate).getTime() - new Date(b.rawDueDate).getTime();
        }
        if (order === 'Due Date - New to Old') {
            return new Date(b.rawDueDate).getTime() - new Date(a.rawDueDate).getTime();
        }
        if (order === 'Room Number') {
            const rA = parseInt(a.room_number) || 99999;
            const rB = parseInt(b.room_number) || 99999;
            return rA - rB;
        }
        if (order === 'Due Amount - High to Low') {
            return b.dueAmount - a.dueAmount;
        }
        if (order === 'Due Amount - Low to High') {
            return a.dueAmount - b.dueAmount;
        }
        return 0;
    });

    // Use student_id as key — studentMap deduplicates by student_id so each student
    // appears once per page load. Stringify the id to be safe.
    const keyExtractor = useCallback((item: DueTenant) => String(item.id), []);
    const renderItem = useCallback(({ item }: { item: DueTenant }) => (
        <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('StudentDetails', { studentId: item.id })}>
            <TenantDueCard
                item={item}
                themeColor={theme.primary}
                onRemind={handleRemind}
                onCollect={handleCollect}
                isDark={isDark}
                theme={theme}
                fontSize={fontSize}
            />
        </TouchableOpacity>
    ), [theme, isDark, fontSize, handleRemind, handleCollect, navigation]);

    // ── LOADING SKELETON ──────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={[s.root, { backgroundColor: theme.background }]}>
                <StatusBar barStyle="light-content" />
                {/* ── Header ── */}
                <AppHeader
                    title={t('pendingDues.title')}
                    subtitle={t('pendingDues.subtitle')}
                    showBack={navigation.canGoBack()}
                    rightComponent={
                        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                            <HeaderNotification navigation={navigation} />
                            <ProfileMenu />
                        </View>
                    }
                />
                {/* Summary skeleton */}
                <View style={s.summaryRow}>
                    <SkeletonCard style={{ flex: 1, height: 110 }} />
                    <SkeletonCard style={{ flex: 1, height: 110 }} />
                </View>
                {/* List skeleton */}
                <View style={{ paddingHorizontal: 16, gap: 12 }}>
                    {[0, 1, 2].map(i => (
                        <SkeletonCard key={i} />
                    ))}
                </View>
            </View>
        );
    }

    // ── MAIN RENDER ───────────────────────────────────────────────────────────
    return (
        <View style={[s.root, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" />
            {/* ── Header ── */}
            <AppHeader
                title={t('pendingDues.title')}
                subtitle={t('pendingDues.subtitle')}
                showBack={navigation.canGoBack()}
                rightComponent={
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                        <HeaderNotification navigation={navigation} />
                        <ProfileMenu />
                    </View>
                }
            />
            {/* ── Premium Summary Cards ─────────────────────────────── */}
            <View style={s.summaryRow}>
                {/* Card 1: Overdue amount */}
                <TouchableOpacity
                    style={[s.summaryCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                    activeOpacity={0.85}
                    onPress={() => setActiveTab('Overdue')}
                >
                    <View style={[s.summaryIconWrap, { backgroundColor: isDark ? '#450A0A' : '#FEE2E2', marginBottom: 4 }]}>
                        <Ionicons name="alert-circle" size={18} color="#DC2626" />
                    </View>
                    <Text style={[s.summaryAmount, { color: '#DC2626', fontSize: 16 }]} numberOfLines={1}>
                        {tabCounts.overdue_amount > 999999
                            ? `₹${(tabCounts.overdue_amount / 100000).toFixed(1)}L`
                            : tabCounts.overdue_amount > 999
                                ? `₹${(tabCounts.overdue_amount / 1000).toFixed(1)}k`
                                : `₹${tabCounts.overdue_amount}`}
                    </Text>
                    <Text style={[s.summaryLabel, { color: theme.textSecondary, marginBottom: 0 }]}>Overdue</Text>
                    <Text style={[s.summaryFooter, { color: isDark ? '#FCA5A5' : '#9B1C1C', fontSize: 9.5 }]}>
                        {tabCounts.overdue} students
                    </Text>
                </TouchableOpacity>

                {/* Card 2: Due Soon amount (₹ in next 7 days) — distinct from tab bar count */}
                <TouchableOpacity
                    style={[s.summaryCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                    activeOpacity={0.85}
                    onPress={() => setActiveTab('Next 7 Days')}
                >
                    <View style={[s.summaryIconWrap, { backgroundColor: isDark ? '#451A03' : '#FEF3C7', marginBottom: 4 }]}>
                        <Ionicons name="time" size={18} color="#D97706" />
                    </View>
                    <Text style={[s.summaryAmount, { color: '#D97706', fontSize: 16 }]} numberOfLines={1}>
                        {tabCounts.next_7_days_amount > 999999
                            ? `₹${(tabCounts.next_7_days_amount / 100000).toFixed(1)}L`
                            : tabCounts.next_7_days_amount > 999
                                ? `₹${(tabCounts.next_7_days_amount / 1000).toFixed(1)}k`
                                : `₹${tabCounts.next_7_days_amount}`}
                    </Text>
                    <Text style={[s.summaryLabel, { color: theme.textSecondary, marginBottom: 0 }]}>Due Soon</Text>
                    <Text style={[s.summaryFooter, { color: isDark ? '#FCD34D' : '#92400E', fontSize: 9.5 }]}>
                        {tabCounts.next_7_days} students · 7 days
                    </Text>
                </TouchableOpacity>

                {/* Card 3: Partial paid amount */}
                <TouchableOpacity
                    style={[s.summaryCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                    activeOpacity={0.85}
                    onPress={() => setActiveTab('All Dues')}
                >
                    <View style={[s.summaryIconWrap, { backgroundColor: isDark ? '#0C2A4A' : '#E0F2FE', marginBottom: 4 }]}>
                        <Ionicons name="hourglass" size={18} color="#0284C7" />
                    </View>
                    <Text style={[s.summaryAmount, { color: '#0284C7', fontSize: 16 }]} numberOfLines={1}>
                        {partialPaid > 999
                            ? `₹${(partialPaid / 1000).toFixed(1)}k`
                            : `₹${partialPaid.toLocaleString('en-IN')}`}
                    </Text>
                    <Text style={[s.summaryLabel, { color: theme.textSecondary, marginBottom: 0 }]}>Partial Paid</Text>
                    <Text style={[s.summaryFooter, { color: isDark ? '#7DD3FC' : '#0369A1', fontSize: 9.5 }]}>
                        {tabCounts.partial_count} students
                    </Text>
                </TouchableOpacity>
            </View>


            {/* ── Search & Filter ──────────────────────────────────────── */}
            <View style={s.searchRow}>
                <View style={[s.searchBox, {
                    backgroundColor: isDark ? '#1E293B' : '#FFF',
                    borderColor: isDark ? '#334155' : '#ECECEC',
                }]}>
                    <Ionicons name="search-outline" size={18} color={isDark ? '#64748B' : '#94A3B8'} />
                    <TextInput
                        style={[s.searchInput, { color: isDark ? '#F8FAFC' : '#1F2937' }]}
                        placeholder="Search tenant or room..."
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                            <Ionicons name="close-circle" size={18} color={isDark ? '#475569' : '#94A3B8'} />
                        </TouchableOpacity>
                    )}
                </View>

                {(() => {
                    const activeFiltersCount = Object.entries(activeFilters).filter(([k, v]) =>
                        v && v !== 'All' && v !== 'All Time' && v !== 'Due Date - Old to New' && v !== ''
                    ).length;
                    return (
                        <TouchableOpacity
                            style={[s.filterBtn, {
                                backgroundColor: isDark ? '#1E293B' : '#FFF',
                                borderColor: filterModalVisible || activeFiltersCount > 0 ? theme.primary : (isDark ? '#334155' : '#ECECEC'),
                                borderWidth: filterModalVisible || activeFiltersCount > 0 ? 1.5 : 1,
                                shadowColor: 'transparent',
                                elevation: 0
                            }]}
                            activeOpacity={0.7}
                            onPress={() => setFilterModalVisible(true)}
                        >
                            <Ionicons name="filter" size={16} color={theme.primary} />
                            <Text style={[s.filterTxt, { color: theme.primary }]}>Filter</Text>
                            {activeFiltersCount > 0 && (
                                <View style={[s.filterBadge, { backgroundColor: theme.primary }]}>
                                    <Text style={s.filterBadgeText}>{activeFiltersCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })()}
            </View>

            {/* ── Active Filters Chips ── */}
            {(activeFilters.status !== 'All' || activeFilters.datePreset !== 'All Time' || activeFilters.room !== 'All' || (activeFilters.sortBy && activeFilters.sortBy !== 'Due Date - Old to New')) && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {activeFilters.status !== 'All' && (
                        <TouchableOpacity
                            style={[s.filterChip, { backgroundColor: isDark ? theme.primary + '30' : theme.primary + '15', flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                            onPress={() => setActiveFilters((prev: any) => ({ ...prev, status: 'All' }))}
                            activeOpacity={0.7}
                        >
                            <Text style={[s.filterChipText, { color: theme.primary }]}>{activeFilters.status}</Text>
                            <Ionicons name="close-circle" size={14} color={theme.primary} />
                        </TouchableOpacity>
                    )}
                    {activeFilters.datePreset !== 'All Time' && (
                        <TouchableOpacity
                            style={[s.filterChip, { backgroundColor: isDark ? theme.primary + '30' : theme.primary + '15', flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                            onPress={() => setActiveFilters((prev: any) => ({ ...prev, datePreset: 'All Time', customStartDate: '', customEndDate: '' }))}
                            activeOpacity={0.7}
                        >
                            <Text style={[s.filterChipText, { color: theme.primary }]}>
                                {activeFilters.datePreset === 'Custom Date Range'
                                    ? `${activeFilters.customStartDate} to ${activeFilters.customEndDate}`
                                    : activeFilters.datePreset}
                            </Text>
                            <Ionicons name="close-circle" size={14} color={theme.primary} />
                        </TouchableOpacity>
                    )}
                    {activeFilters.room !== 'All' && (
                        <TouchableOpacity
                            style={[s.filterChip, { backgroundColor: isDark ? theme.primary + '30' : theme.primary + '15', flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                            onPress={() => setActiveFilters((prev: any) => ({ ...prev, room: 'All' }))}
                            activeOpacity={0.7}
                        >
                            <Text style={[s.filterChipText, { color: theme.primary }]}>Room {activeFilters.room}</Text>
                            <Ionicons name="close-circle" size={14} color={theme.primary} />
                        </TouchableOpacity>
                    )}
                    {activeFilters.sortBy && activeFilters.sortBy !== 'Due Date - Old to New' && (
                        <TouchableOpacity
                            style={[s.filterChip, { backgroundColor: isDark ? theme.primary + '30' : theme.primary + '15', flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                            onPress={() => setActiveFilters((prev: any) => ({ ...prev, sortBy: 'Due Date - Old to New' }))}
                            activeOpacity={0.7}
                        >
                            <Text style={[s.filterChipText, { color: theme.primary }]}>Sorted: {activeFilters.sortBy}</Text>
                            <Ionicons name="close-circle" size={14} color={theme.primary} />
                        </TouchableOpacity>
                    )}
                </View>
            )}
            {/* ── Tabs: Overdue / Next 7 Days / All Dues / Plan Renewals ── */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 6 }}>
                {(['Overdue', 'Next 7 Days', 'All Dues'] as const).map(tab => {
                    const isActive = activeTab === tab;
                    const count = tab === 'Overdue' ? tabCounts.overdue : tab === 'Next 7 Days' ? tabCounts.next_7_days : tabCounts.all;
                    return (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            activeOpacity={0.8}
                            style={[{
                                flex: 1,
                                paddingVertical: 8,
                                borderRadius: 10,
                                alignItems: 'center',
                                borderWidth: 1.5,
                                borderColor: isActive ? theme.primary : (isDark ? '#334155' : '#E2E8F0'),
                                backgroundColor: isActive ? theme.primary + '15' : (isDark ? '#1E293B' : '#FFF'),
                            }]}
                        >
                            <Text style={{ fontSize: 11, fontWeight: '800', color: isActive ? theme.primary : (isDark ? '#64748B' : '#94A3B8') }}>
                                {tab}
                            </Text>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: isActive ? theme.primary : (isDark ? '#94A3B8' : '#64748B'), marginTop: 1 }}>
                                {count}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
                {/* Plan Renewals tab */}
                {(() => {
                    const isActive = activeTab === 'Plan Renewals';
                    return (
                        <TouchableOpacity
                            onPress={() => setActiveTab('Plan Renewals')}
                            activeOpacity={0.8}
                            style={[{
                                flex: 1,
                                paddingVertical: 8,
                                borderRadius: 10,
                                alignItems: 'center',
                                borderWidth: 1.5,
                                borderColor: isActive ? '#D97706' : (isDark ? '#334155' : '#E2E8F0'),
                                backgroundColor: isActive ? '#FEF3C7' : (isDark ? '#1E293B' : '#FFF'),
                            }]}
                        >
                            <Text style={{ fontSize: 11, fontWeight: '800', color: isActive ? '#92400E' : (isDark ? '#64748B' : '#94A3B8') }}>
                                Renewals
                            </Text>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: isActive ? '#92400E' : (isDark ? '#94A3B8' : '#64748B'), marginTop: 1 }}>
                                {renewalStudents.length}
                            </Text>
                        </TouchableOpacity>
                    );
                })()}
            </View>
            {/* ── Count row ─────────────────────────────────────────── */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', fontWeight: '600' }}>
                    Showing {filteredTenants.length} student{filteredTenants.length !== 1 ? 's' : ''}
                </Text>
                {Object.entries(activeFilters).some(([k, v]) => v && v !== 'All' && v !== 'All Time' && v !== 'Due Date - Old to New' && v !== '') && (
                    <TouchableOpacity onPress={handleClearFilters}>
                        <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '700' }}>Clear Filters</Text>
                    </TouchableOpacity>
                )}
            </View>

            {activeTab === 'Plan Renewals' ? (
                renewalsLoading ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
                        <ActivityIndicator color={theme.primary} />
                        <Text style={{ marginTop: 12, color: theme.textSecondary }}>Loading renewals...</Text>
                    </View>
                ) : renewalStudents.length === 0 ? (
                    <EmptyState illustration="pending" title="No Renewals Due" subtitle="No plan renewals due in the next 15 days." />
                ) : (
                    <FlatList
                        data={renewalStudents}
                        keyExtractor={(item: any) => String(item.student_id)}
                        contentContainerStyle={{ paddingBottom: 120, paddingTop: 2, paddingHorizontal: 16 }}
                        renderItem={({ item }: any) => {
                            const today = new Date(); today.setHours(0, 0, 0, 0);
                            const planEnd = new Date(item.plan_end_date); planEnd.setHours(0, 0, 0, 0);
                            const daysLeft = Math.ceil((planEnd.getTime() - today.getTime()) / 86400000);
                            const isExpired = daysLeft < 0;
                            const planLabels: Record<number, string> = { 3: '3-Month Plan', 6: '6-Month Plan', 12: '1-Year Plan' };
                            const planLabel = planLabels[item.fee_plan] || `${item.fee_plan}-Month Plan`;
                            const accentColor = isExpired ? '#DC2626' : daysLeft <= 7 ? '#EF4444' : '#D97706';
                            const endDateStr = planEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                            return (
                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={() => navigation.navigate('StudentDetails', { studentId: item.student_id })}
                                    style={[{
                                        backgroundColor: isDark ? '#1E293B' : '#FFF',
                                        borderRadius: 14,
                                        marginBottom: 12,
                                        padding: 14,
                                        borderWidth: 1.5,
                                        borderColor: accentColor + '60',
                                        borderLeftWidth: 4,
                                        borderLeftColor: accentColor,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 12,
                                    }]}
                                >
                                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: accentColor + '20', alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="refresh-circle" size={24} color={accentColor} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Text style={{ fontSize: 15, fontWeight: '800', color: isDark ? '#F8FAFC' : '#1F2937' }} numberOfLines={1}>
                                                {item.first_name} {item.last_name || ''}
                                            </Text>
                                            <View style={{ backgroundColor: accentColor + '20', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                                                <Text style={{ fontSize: 10, fontWeight: '700', color: accentColor }}>{planLabel}</Text>
                                            </View>
                                        </View>
                                        <Text style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
                                            Room {item.room_number || 'N/A'} · Ends {endDateStr}
                                        </Text>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: accentColor, marginTop: 3 }}>
                                            {isExpired ? `⚠ Expired ${Math.abs(daysLeft)} days ago` : `${daysLeft} day${daysLeft === 1 ? '' : 's'} until renewal`}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                        {item.plan_amount > 0 && (
                                            <Text style={{ fontSize: 14, fontWeight: '800', color: accentColor }}>₹{Number(item.plan_amount).toLocaleString('en-IN')}</Text>
                                        )}
                                        <TouchableOpacity
                                            style={{ backgroundColor: accentColor, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                                            onPress={() => {
                                                setSelectedFee({
                                                    id: item.student_id,
                                                    name: `${item.first_name} ${item.last_name || ''}`.trim(),
                                                    hostel_id: item.hostel_id,
                                                    dueAmount: item.plan_amount || 0,
                                                    paidAmount: 0,
                                                    monthlyRent: item.monthly_rent || 0,
                                                    carryForward: 0,
                                                    feeMonth: new Date().toISOString().substring(0, 7),
                                                    rawDueDate: item.plan_end_date,
                                                    room: item.room_number || 'N/A',
                                                    room_number: item.room_number || 'N/A',
                                                });
                                                setPayAmount(item.plan_amount?.toString() || '');
                                                setPayNotes(''); setPayTransactionId('');
                                                setPayDate(toLocalDateStr(new Date()));
                                                setPayDueDate(item.plan_end_date?.split('T')[0] || toLocalDateStr(new Date()));
                                                setCollectModalVisible(true);
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Collect</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                        showsVerticalScrollIndicator={false}
                    />
                )
            ) : (
            <FlatList
                data={filteredTenants}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                contentContainerStyle={{ paddingBottom: 120, paddingTop: 2 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); setPage(1); setHasMore(true); load(1, true); }}
                        tintColor={theme.primary}
                        progressViewOffset={20}
                    />
                }
                onEndReached={() => {
                    if (loadingMore || !hasMore) return;
                    setPage(prev => { const next = prev + 1; load(next, false); return next; });
                }}
                onEndReachedThreshold={0.4}
                ListEmptyComponent={
                    error ? (
                        <ErrorState onRetry={() => load(1, false)} />
                    ) : (
                        <EmptyState illustration="pending"
                            title={t('pendingDues.allClear', 'All Clear!')}
                            subtitle={t('pendingDues.noPendingPayments', 'No pending payments found.')}
                        />
                    )
                }
                ListFooterComponent={
                    <LoadMoreFooter loading={loadingMore} hasMore={hasMore} total={filteredTenants.length} noun="dues" />
                }
            />
            )}

            {/* ── Remind Modal ──────────────────────────────────────────────── */}
            <RemindModal
                visible={!!remindTarget}
                tenant={remindTarget}
                onClose={() => setRemindTarget(null)}
            />

            {/* ── Collect Drawer ────────────────────────────────────────────── */}
            <PaymentDrawer
                visible={collectModalVisible}
                onClose={() => setCollectModalVisible(false)}
                selectedFee={selectedFee ? {
                    ...selectedFee,
                    pending_dues: [
                        {
                            fee_month: selectedFee.feeMonth,
                            balance: selectedFee.dueAmount,
                            monthly_rent: selectedFee.monthlyRent,
                            carry_forward: selectedFee.carryForward,
                            total_due: selectedFee.dueAmount
                        }
                    ]
                } : null}
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

            <FilterDuesModal
                visible={filterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                onApply={handleApplyFilters}
                initialFilters={activeFilters}
            />
        </View>
    );
}

// ─── Wave decoration styles ───────────────────────────────────────────────────
const wave = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        overflow: 'hidden',
    }
});

// ─── Tenant card styles ───────────────────────────────────────────────────────
const card = StyleSheet.create({
    wrap: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 22,
        borderWidth: 1,
        overflow: 'hidden',
        elevation: 3,
        shadowOpacity: 0.06,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 8 },
    },
    accentBar: {
        width: 4,
        borderTopLeftRadius: 22,
        borderBottomLeftRadius: 22,
    },
    body: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
        position: 'relative',
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 16,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarTxt: { fontSize: 18, fontWeight: '900' },
    infoCol: { flex: 1, justifyContent: 'center' },
    name: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
    roomTxt: { fontSize: 12, fontWeight: '700' },
    amountBig: { fontWeight: '900' },
    carryNote: { fontSize: 11, fontWeight: '600', marginBottom: 12 },

    divider: { height: 1, marginBottom: 14 },

    actionsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 42,
        borderRadius: 12,
    },
    actionBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
    statusBadge: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 8,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    statusBadgeText: {
        color: '#FFF',
        fontSize: 9.5,
        fontWeight: '800',
    },
});

// ─── Remind Modal styles ──────────────────────────────────────────────────────
const rm = StyleSheet.create({
    backdrop: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'transparent',
    },
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 36,
    },
    handle: {
        width: 36, height: 4, borderRadius: 2,
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
    tenantName: { fontSize: 15, fontWeight: '800' },
    tenantRoom: { fontSize: 12, fontWeight: '600' },
    closeBtn: {
        width: 32, height: 32, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
    },
    subtitle: {
        fontSize: 12, fontWeight: '600',
        paddingHorizontal: 20, marginBottom: 12, marginTop: 8,
    },
    option: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1,
    },
    optionIcon: {
        width: 46, height: 46, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
    },
    optionLabel: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
    optionSub: { fontSize: 12, fontWeight: '500' },
});

// ─── Main screen styles ───────────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1 },

    // ── Hero ──
    hero: {
        paddingBottom: 8,
        position: 'relative',
        overflow: 'hidden',
    },
    heroBg: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 140,
        backgroundColor: '#FFF4EC',
        // The warm hostel-ish pastel background tint
    },
    heroContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 8,
    },
    heroTitle: {
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    heroSub: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 2,
    },
    heroActions: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },

    // ── Summary ──
    summaryRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 6,
        gap: 10,
    },
    summaryCard: {
        flex: 1,
        borderRadius: 16,
        padding: 9,
        position: 'relative',
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        minHeight: 86,
        borderWidth: 1.5,
    },
    summaryCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    summaryIconWrap: {
        width: 26,
        height: 26,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryArrowBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryLabel: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 1,
    },
    summaryAmount: {
        fontSize: 17,
        fontWeight: '900',
        marginBottom: 1,
    },
    summaryFooter: {
        fontSize: 10,
        fontWeight: '700',
        zIndex: 2,
    },

    // ── Search + Filter ──
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#ECECEC',
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        backgroundColor: '#FFF',
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
        padding: 0,
        height: 18,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    filterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 14,
        elevation: 1,
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    filterTxt: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
    filterBadge: {
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 2,
    },
    filterBadgeText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: '800',
    },

    // ── Empty ──
    emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
    emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
    emptySub: { fontSize: 13, fontWeight: '500' },

    // ── Skeleton ──
    skeletonCard: {
        height: 120,
        borderRadius: 16,
        marginBottom: 10,
        opacity: 0.5,
    },
});
