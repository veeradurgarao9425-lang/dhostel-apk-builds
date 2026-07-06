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
import { FullScreenLoader } from '../components/FullScreenLoader';

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

// ─── Tenant Due Card (matches reference image exactly) ────────────────────────
const TenantDueCard = React.memo(({ item, themeColor, onRemind, onCollect, isDark, theme, fontSize }: {
    item: DueTenant;
    themeColor: string;
    onRemind: (t: DueTenant) => void;
    onCollect: (t: DueTenant) => void;
    isDark: boolean;
    theme: any;
    fontSize: number;
}) => {
    const { t } = useTranslation();
    const palette = avatarPalette(item.name);
    const accentColor = item.isOverdue ? '#DC2626' : '#D97706';
    const tagLabel = item.isOverdue
        ? `${item.daysOverdue}d overdue`
        : `Due: ${item.dueDate}`;

    const getBadgeStyle = () => {
        if (item.isOverdue) return { bg: '#FEE2E2', text: '#DC2626', label: 'Overdue' };
        if (item.paidAmount > 0) return { bg: '#FFEDD5', text: '#EA580C', label: 'Partly Paid' };
        return { bg: '#FEE2E2', text: '#DC2626', label: 'Unpaid' };
    };
    const badgeStyle = getBadgeStyle();

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
                <SkylineDecoration />
                {/* ── Top row: Avatar | Name+Room | Badge ── */}
                <View style={card.topRow}>
                    {/* Avatar */}
                    <View style={[card.avatar, { backgroundColor: palette.bg }]}>
                        <Text style={[card.avatarTxt, { color: palette.text }]}>
                            {item.name[0].toUpperCase()}
                        </Text>
                    </View>

                    {/* Info */}
                    <View style={card.infoCol}>
                        <Text style={[card.name, { color: isDark ? '#F8FAFC' : '#1F2937', fontSize: fontSize + 1 }]} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <Text style={[card.roomTxt, { color: '#6B7280', fontSize: fontSize - 2 }]} numberOfLines={1}>
                            Room {item.room} · {(item as any).displayMonth || item.feeMonth}
                        </Text>
                    </View>

                    {/* Right: Badge */}
                    <View style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 6 }}>
                        <View style={[card.badge, { backgroundColor: badgeStyle.bg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }]}>
                            <Text style={[card.badgeTxt, { color: badgeStyle.text, fontSize: 12, fontWeight: '800' }]}>{badgeStyle.label}</Text>
                        </View>
                        <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: '600' }}>{tagLabel}</Text>
                    </View>
                </View>

                {/* ── Divider ── */}
                <View style={[card.divider, { backgroundColor: '#ECECEC' }]} />

                {/* ── Bottom row: Stats | Actions ── */}
                <View style={card.bottomRow}>
                    {/* Totals */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'space-between' }}>
                        <View style={card.statCol}>
                            <Text style={[card.statLabel, { color: '#EF4444', fontSize: 10, fontWeight: '700' }]} numberOfLines={1}>Prev Overdue</Text>
                            <Text style={[card.statVal, { color: '#EF4444', fontWeight: '800' }]} numberOfLines={1}>
                                ₹{item.carryForward.toLocaleString('en-IN')}
                            </Text>
                        </View>
                        <View style={card.statCol}>
                            <Text style={[card.statLabel, { color: '#6B7280', fontSize: 10 }]} numberOfLines={1}>This Month</Text>
                            <Text style={[card.statVal, { color: isDark ? '#F8FAFC' : '#1F2937' }]} numberOfLines={1}>
                                ₹{item.monthlyRent.toLocaleString('en-IN')}
                            </Text>
                        </View>
                        <View style={card.statCol}>
                            <Text style={[card.statLabel, { color: accentColor, fontWeight: '700' }]} numberOfLines={1}>Total Due</Text>
                            <Text style={[card.statVal, { color: accentColor, fontSize: fontSize + 2, fontWeight: '800' }]} numberOfLines={1}>
                                ₹{item.dueAmount.toLocaleString('en-IN')}
                            </Text>
                            {item.paidAmount > 0 && (
                                <Text style={{ fontSize: 9, color: '#10B981', marginTop: 2, fontWeight: '600' }}>Paid: ₹{item.paidAmount}</Text>
                            )}
                        </View>
                    </View>

                    {/* Spacer */}
                    <View style={{ width: 16 }} />

                    {/* Action buttons */}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity
                            style={[card.iconBtn, { borderColor: theme.primary, backgroundColor: '#FFFFFF', borderWidth: 1.5 }]}
                            onPress={() => onRemind(item)}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="notifications" size={18} color={theme.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[card.iconBtn, { backgroundColor: theme.primary, borderWidth: 0 }]}
                            onPress={() => onCollect(item)}
                            activeOpacity={0.75}
                        >
                            <MaterialCommunityIcons name="currency-inr" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Breakdown: always show if there's data ── */}
                {item.breakdown && item.breakdown.length > 0 && (
                    <View style={{ marginTop: 8, padding: 8, backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: accentColor }}>
                        <Text style={{ fontSize: fontSize - 3, color: isDark ? '#94A3B8' : '#64748B', fontWeight: '700', marginBottom: 4 }}>
                            📋 Payment breakdown:
                        </Text>
                        {item.breakdown.map((b: any, i: number) => (
                            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1 }}>
                                <Text style={{ fontSize: fontSize - 3, color: (b as any).isPast ? '#DC2626' : (isDark ? '#CBD5E1' : '#475569') }}>
                                    {(b as any).isPast ? '⚠ ' : '• '}{b.month}
                                </Text>
                                <Text style={{ fontSize: fontSize - 3, fontWeight: '700', color: (b as any).isPast ? '#DC2626' : accentColor }}>
                                    ₹{b.amount.toLocaleString('en-IN')}
                                </Text>
                            </View>
                        ))}
                        <View style={{ marginTop: 4, borderTopWidth: 1, borderTopColor: isDark ? '#334155' : '#E2E8F0', paddingTop: 4, flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: fontSize - 3, fontWeight: '800', color: isDark ? '#F8FAFC' : '#1F2937' }}>Total Due</Text>
                            <Text style={{ fontSize: fontSize - 3, fontWeight: '800', color: accentColor }}>₹{item.dueAmount.toLocaleString('en-IN')}</Text>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
});

// ─── Skyline SVG decoration ───────────────────────────────────────────────────
const SkylineDecoration = () => (
    <View style={{ position: 'absolute', bottom: 0, right: 0, left: 0, height: 60, opacity: 0.04 }} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 400 60" preserveAspectRatio="none">
            <Path fill="#1F2937" d="M0,60 L0,50 L20,50 L20,60 M20,60 L20,30 L60,30 L60,60 M60,60 L60,20 L90,20 L90,60 M90,60 L90,40 L120,40 L120,60 M120,60 L120,10 L160,10 L160,60 M160,60 L160,25 L190,25 L190,60 M190,60 L190,45 L220,45 L220,60 M220,60 L220,15 L260,15 L260,60 M260,60 L260,5 L310,5 L310,60 M310,60 L310,35 L340,35 L340,60 M340,60 L340,25 L380,25 L380,60 M380,60 L380,40 L400,40 L400,60" />
        </Svg>
    </View>
);

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
    const [refreshing, setRefreshing] = useState(false);
    const [remindTarget, setRemindTarget] = useState<DueTenant | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    
    // Filter Modal state
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [activeFilters, setActiveFilters] = useState<any>({ status: 'All', datePreset: 'All Time', room: 'All' });
    const handleApplyFilters = async (filters: any) => {
        setFilterModalVisible(false);
        setActiveFilters(filters);
        setLoading(true);
        setPage(1);
        setHasMore(true);
        await load(1, false);
        setLoading(false);
    };
    const [totalPending, setTotalPending] = useState(0);
    const [partialPaid, setPartialPaid] = useState(0);
    const [totalDefaulters, setTotalDefaulters] = useState(0);

    const initialTab = (['Overdue', 'Next 7 Days', 'All Dues'] as const).includes(route.params?.tab)
        ? route.params.tab
        : 'Overdue';
    const [activeTab, setActiveTab] = useState<'Overdue' | 'Next 7 Days' | 'All Dues'>(initialTab);
    const [tabCounts, setTabCounts] = useState({ overdue: 0, next_7_days: 0, all: 0 });

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
            const now = new Date();
            const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const lastMonthDate = new Date(); lastMonthDate.setMonth(now.getMonth() - 1);
            const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
            
            if (activeFilters.datePreset === 'This Month' && t.feeMonth !== thisMonthStr) return false;
            if (activeFilters.datePreset === 'Last Month' && t.feeMonth !== lastMonthStr) return false;
            if (activeFilters.datePreset === 'Older' && (t.feeMonth === thisMonthStr || t.feeMonth === lastMonthStr)) return false;
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
        }

        return true;
    });

    const keyExtractor = useCallback((item: DueTenant) => `due-${item.id}`, []);
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
            {/* ── Page Title ───────────────────────────────────────────── */}
            <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#F8FAFC' : '#1F2937', textAlign: 'left' }}>
                    Pending Dues
                </Text>
            </View>

            {/* ── Fixed Summary Cards ──────────────────────────────────── */}
            <View style={s.summaryRow}>
                {/* Card 1: Outstanding Dues */}
                <View style={[s.summaryCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#FCA5A5', borderWidth: 1 }]}>
                    <View style={s.summaryCardTop}>
                        <View style={[s.summaryIconWrap, { backgroundColor: '#FEF2F2' }]}>
                            <MaterialCommunityIcons name="file-document-arrow-right-outline" size={24} color="#EF4444" />
                        </View>
                    </View>
                    <Text style={[s.summaryLabel, { color: '#EF4444' }]}>
                        {t('pendingDues.outstandingDues')}
                    </Text>
                    <Text style={[s.summaryAmount, { color: isDark ? '#F8FAFC' : '#1F2937' }]}>
                        ₹{totalPending.toLocaleString('en-IN')}
                    </Text>
                    <Text style={[s.summaryFooter, { color: isDark ? '#CBD5E1' : '#6B7280' }]}>
                        {totalDefaulters} {t('pendingDues.defaulters')}
                    </Text>
                    <WaveDecoration color="#EF4444" />
                </View>

                {/* Card 2: Partial Paid */}
                <View style={[s.summaryCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#FCD34D', borderWidth: 1 }]}>
                    <View style={s.summaryCardTop}>
                        <View style={[s.summaryIconWrap, { backgroundColor: '#FFFBEB' }]}>
                            <Ionicons name="hourglass" size={24} color="#F59E0B" />
                        </View>
                    </View>
                    <Text style={[s.summaryLabel, { color: '#F59E0B' }]}>
                        {t('pendingDues.partialPaid')}
                    </Text>
                    <Text style={[s.summaryAmount, { color: isDark ? '#F8FAFC' : '#1F2937' }]}>
                        ₹{partialPaid.toLocaleString('en-IN')}
                    </Text>
                    <Text style={[s.summaryFooter, { color: isDark ? '#CBD5E1' : '#6B7280' }]}>
                        {t('pendingDues.duesCollectedPartially')}
                    </Text>
                    <WaveDecoration color="#F59E0B" />
                </View>
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

                <TouchableOpacity
                    style={[s.filterBtn, { 
                        backgroundColor: isDark ? '#1E293B' : '#FFF', 
                        borderColor: filterModalVisible || Object.values(activeFilters).some(v => v !== 'All' && v !== 'All Time') ? theme.primary : (isDark ? '#334155' : '#ECECEC'), 
                        borderWidth: filterModalVisible || Object.values(activeFilters).some(v => v !== 'All' && v !== 'All Time') ? 1.5 : 1, 
                        shadowColor: 'transparent', 
                        elevation: 0 
                    }]}
                    activeOpacity={0.7}
                    onPress={() => setFilterModalVisible(true)}
                >
                    <Ionicons name="filter" size={16} color={theme.primary} />
                    <Text style={[s.filterTxt, { color: theme.primary }]}>
                        Filter {Object.values(activeFilters).filter(v => v !== 'All' && v !== 'All Time').length > 0 ? `(${Object.values(activeFilters).filter(v => v !== 'All' && v !== 'All Time').length})` : ''}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ── Active Filters Chips ── */}
            {(activeFilters.status !== 'All' || activeFilters.datePreset !== 'All Time' || activeFilters.room !== 'All') && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {activeFilters.status !== 'All' && (
                        <View style={[s.filterChip, { backgroundColor: isDark ? theme.primary + '30' : theme.primary + '15' }]}>
                            <Text style={[s.filterChipText, { color: theme.primary }]}>{activeFilters.status}</Text>
                        </View>
                    )}
                    {activeFilters.datePreset !== 'All Time' && (
                        <View style={[s.filterChip, { backgroundColor: isDark ? theme.primary + '30' : theme.primary + '15' }]}>
                            <Text style={[s.filterChipText, { color: theme.primary }]}>{activeFilters.datePreset}</Text>
                        </View>
                    )}
                    {activeFilters.room !== 'All' && (
                        <View style={[s.filterChip, { backgroundColor: isDark ? theme.primary + '30' : theme.primary + '15' }]}>
                            <Text style={[s.filterChipText, { color: theme.primary }]}>Room {activeFilters.room}</Text>
                        </View>
                    )}
                </View>
            )}
            {/* ── Tabs ─────────────────────────────────────── */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}>
                {(['Overdue', 'Next 7 Days', 'All Dues'] as const).map(tab => {
                    const isActive = activeTab === tab;
                    const tabColors: Record<string, string> = {
                        'Overdue': '#DC2626',
                        'Next 7 Days': '#D97706',
                        'All Dues': theme.primary,
                    };
                    const color = tabColors[tab];
                    const counts: Record<string, number> = { 
                        'Overdue': tabCounts.overdue, 
                        'Next 7 Days': tabCounts.next_7_days, 
                        'All Dues': tabCounts.all 
                    };
                    return (
                        <TouchableOpacity
                            key={tab}
                            style={{
                                flex: 1,
                                paddingVertical: 8,
                                paddingHorizontal: 4,
                                borderRadius: 20,
                                backgroundColor: isActive ? color : (isDark ? '#1E293B' : '#F1F5F9'),
                                borderWidth: 1.5,
                                borderColor: isActive ? color : (isDark ? '#334155' : '#E2E8F0'),
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                            }}
                            onPress={() => setActiveTab(tab)}
                            activeOpacity={0.8}
                        >
                            <Text style={{
                                color: isActive ? '#FFF' : (isDark ? '#94A3B8' : '#64748B'),
                                fontWeight: isActive ? '700' : '500',
                                fontSize: 12,
                            }}>
                                {tab}
                            </Text>
                            {counts[tab] > 0 && (
                                <View style={{
                                    backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : color + '20',
                                    borderRadius: 10,
                                    paddingHorizontal: 6,
                                    paddingVertical: 1,
                                    minWidth: 20,
                                    alignItems: 'center',
                                }}>
                                    <Text style={{ color: isActive ? '#FFF' : color, fontSize: 10, fontWeight: '800' }}>{counts[tab]}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
            {/* ── Count row ─────────────────────────────────────────── */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', fontWeight: '600' }}>
                    Showing {filteredTenants.length} student{filteredTenants.length !== 1 ? 's' : ''}
                </Text>
                {Object.values(activeFilters).some(v => v !== 'All' && v !== 'All Time') && (
                    <TouchableOpacity onPress={() => setActiveFilters({ status: 'All', datePreset: 'All Time', room: 'All' })}>
                        <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '700' }}>Clear Filters</Text>
                    </TouchableOpacity>
                )}
            </View>

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
                    <View style={s.emptyWrap}>
                        <Text style={{ fontSize: 52, marginBottom: 12 }}>🎉</Text>
                        <Text style={[s.emptyTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
                            {t('pendingDues.allClear')}
                        </Text>
                        <Text style={[s.emptySub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                            {t('pendingDues.noPendingPayments')}
                        </Text>
                    </View>
                }
                ListFooterComponent={
                    loadingMore ? (
                        <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 20 }} />
                    ) : !hasMore && filteredTenants.length > 0 ? (
                        <View style={{ alignItems: 'center', marginVertical: 20 }}>
                            <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '600' }}>
                                {t('pendingDues.allDuesLoaded')}
                            </Text>
                        </View>
                    ) : null
                }
            />

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
    roomTxt: { fontSize: 12, fontWeight: '600' },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeTxt: { fontSize: 11, fontWeight: '700' },
    
    divider: { height: 1, marginBottom: 16 },

    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statCol: { alignItems: 'flex-start', flex: 1 },
    statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize', marginBottom: 2 },
    statVal: { fontSize: 14, fontWeight: '800' },

    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
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
        paddingTop: 12,
        paddingBottom: 8,
        gap: 12,
    },
    summaryCard: {
        flex: 1,
        borderRadius: 18,
        padding: 12,
        position: 'relative',
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 8 },
        minHeight: 85,
    },
    summaryCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    summaryIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 10,
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
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 2,
    },
    summaryAmount: {
        fontSize: 20,
        fontWeight: '900',
        marginBottom: 2,
    },
    summaryFooter: {
        fontSize: 11,
        fontWeight: '700',
        zIndex: 2,
    },

    // ── Search + Filter ──
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#ECECEC',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        backgroundColor: '#FFF',
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        padding: 0,
        height: 20,
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        elevation: 2,
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    filterTxt: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

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
