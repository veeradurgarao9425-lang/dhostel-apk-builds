import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Linking,
    Image,
    FlatList,
    Dimensions,
    StatusBar,
    TextInput,
} from 'react-native';
import {
    BedDouble,
    Users,
    IndianRupee,
    CheckCircle2,
    Phone,
    Edit3,
    Building2,
    LayoutGrid,
    Star,
    Wind,
    Bath,
    Wifi,
    Eye,
    Layers,
    BookOpen,
    Armchair,
    TrendingUp,
    UserPlus,
    LogOut,
    X,
    CreditCard,
    MessageCircle,
    Calendar,
    Clock,
} from 'lucide-react-native';
import api from '../services/api';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AppHeader } from '../components/AppHeader';
import { SkeletonDetails } from '../components/ui/SkeletonDetails';
import { useTheme } from '../../contexts/ThemeContext';
import { Badge } from '../components/Badge';
import { PaymentDrawer } from '../components/PaymentDrawer';
import { ModalSheet } from '../components/FormComponents';
import { useToast } from '../context/ToastContext';
import { useRefresh } from '../../contexts/RefreshContext';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { toLocalDateStr } from '../utils/dateUtils';
import { getResolvedImageUrl } from '../utils/imageHelper';

const { width } = Dimensions.get('window');

// ── Amenity icon map ────────────────────────────────────────────────────────
const AMENITY_ICONS: Record<string, any> = {
    'AC': Wind,
    'Attached Bathroom': Bath,
    'WiFi': Wifi,
    'Balcony': Building2,
    'Window': Eye,
    'Cupboard': Layers,
    'Study Table': BookOpen,
    'Chair': Armchair,
};
const getAmenityIcon = (name: string) => AMENITY_ICONS[name] || Star;

export const RoomDetailsScreen = ({ route }: any) => {
    const { roomId } = route.params;
    const navigation = useNavigation<any>();
    const { theme, isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [room, setRoom] = useState<any>(null);
    const [selectedBedIndex, setSelectedBedIndex] = useState<number | null>(null);
    const { showError, showSuccess, showApiError } = useToast();
    const { triggerRefresh } = useRefresh();

    // ── Direct Payment Drawer State ──
    const [payModalVisible, setPayModalVisible] = useState(false);
    const [selectedOccupant, setSelectedOccupant] = useState<any>(null);
    const [paymentModes, setPaymentModes] = useState<any[]>([]);
    const [payAmount, setPayAmount] = useState('');
    const [payNotes, setPayNotes] = useState('');
    const [payTransactionId, setPayTransactionId] = useState('');
    const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
    const [payDueDate, setPayDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [payModeId, setPayModeId] = useState('1');
    const [payReceiptNumber, setPayReceiptNumber] = useState('');
    const [payReason, setPayReason] = useState('');
    const [payLoading, setPayLoading] = useState(false);

    // ── Direct Schedule Vacate Drawer State ──
    const [noticeModalVisible, setNoticeModalVisible] = useState(false);
    const [noticeDate, setNoticeDate] = useState(toLocalDateStr(new Date()));
    const [noticeReason, setNoticeReason] = useState('');
    const [noticeDatePickerVisible, setNoticeDatePickerVisible] = useState(false);
    const [noticeLoading, setNoticeLoading] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            fetchRoomDetails();
        }, [roomId])
    );

    const fetchRoomDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/rooms/${roomId}`);
            if (response.data.success) {
                const roomData = response.data.data;
                const occupants = roomData?.occupants || [];

                // Always enrich occupants with student details so vacate_notice_date is 100% loaded in all scenarios
                if (occupants.length > 0) {
                    try {
                        const enriched = await Promise.all(
                            occupants.map(async (occ: any) => {
                                try {
                                    const stRes = await api.get(`/students/${occ.student_id}`);
                                    const st = stRes.data?.data || stRes.data;
                                    if (st) {
                                        const photo = st.profile_photo_url || st.photo || st.profile_photo || occ.photo || occ.profile_photo_url || null;
                                        return {
                                            ...occ,
                                            photo: photo,
                                            profile_photo_url: photo,
                                            vacate_notice_date: st.vacate_notice_date ?? occ.vacate_notice_date ?? null,
                                            vacate_notice_reason: st.vacate_notice_reason ?? occ.vacate_notice_reason ?? null,
                                        };
                                    }
                                } catch (e) {
                                    // Keep existing occupant data on failure
                                }
                                return occ;
                            })
                        );
                        roomData.occupants = enriched;
                    } catch (enrichErr) {
                        console.error('Error enriching room occupants:', enrichErr);
                    }
                }

                setRoom(roomData);
            }
        } catch (error) {
            console.error('Error fetching room details:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPaymentModes = useCallback(async () => {
        if (paymentModes.length > 0) return;
        try {
            const res = await api.get('/monthly-fees/payment-modes');
            if (res.data?.success) {
                setPaymentModes(res.data.data);
                const first = res.data.data[0];
                if (first) setPayModeId(String(first.payment_mode_id || first.id));
            }
        } catch (e) {
            console.error('Error fetching payment modes:', e);
        }
    }, [paymentModes.length]);

    const handleOpenPay = useCallback((occupant: any) => {
        setSelectedOccupant(occupant);
        const due = parseFloat(occupant.due_amount || 0);
        const rent = parseFloat(room?.rent_per_bed || 0);
        setPayAmount(due > 0 ? String(due) : (rent > 0 ? String(rent) : ''));
        setPayDate(new Date().toISOString().split('T')[0]);
        setPayDueDate(new Date().toISOString().split('T')[0]);
        setPayNotes('');
        setPayTransactionId('');
        setPayReceiptNumber('');
        setPayReason('');
        fetchPaymentModes();
        setPayModalVisible(true);
    }, [room?.rent_per_bed, fetchPaymentModes]);

    const handleConfirmPayment = useCallback(async () => {
        if (!selectedOccupant) return;
        if (!payAmount || isNaN(Number(payAmount)) || Number(payAmount) <= 0) {
            showError('Please enter a valid amount.');
            return;
        }

        try {
            setPayLoading(true);
            const payDateObj = new Date(payDate);
            const feeMonth = `${payDateObj.getFullYear()}-${String(payDateObj.getMonth() + 1).padStart(2, '0')}`;

            const payload = {
                student_id: selectedOccupant.student_id,
                hostel_id: room?.hostel_id,
                amount: parseFloat(payAmount),
                payment_date: payDate,
                due_date: payDueDate,
                payment_mode_id: parseInt(payModeId),
                transaction_id: payTransactionId || null,
                receipt_number: payReceiptNumber || null,
                notes: payNotes,
                reason: payReason || null,
                fee_month: feeMonth,
            };

            const response = await api.post('/monthly-fees/record-payment', payload);
            if (response.data?.success) {
                showSuccess(`Payment of ₹${payAmount} recorded for ${selectedOccupant.first_name}!`);
                setPayModalVisible(false);
                fetchRoomDetails();
                triggerRefresh();
            }
        } catch (err: any) {
            showApiError(err, 'Failed to record payment');
        } finally {
            setPayLoading(false);
        }
    }, [selectedOccupant, payAmount, payDate, payDueDate, payModeId, payTransactionId, payReceiptNumber, payNotes, payReason, room?.hostel_id, fetchRoomDetails, triggerRefresh, showError, showSuccess, showApiError]);

    const handleOpenScheduleVacate = useCallback((occupant: any) => {
        setSelectedOccupant(occupant);
        const existingDate = occupant.vacate_notice_date
            ? (typeof occupant.vacate_notice_date === 'string' && occupant.vacate_notice_date.includes('T')
                ? occupant.vacate_notice_date.split('T')[0]
                : occupant.vacate_notice_date)
            : toLocalDateStr(new Date());
        setNoticeDate(existingDate);
        setNoticeReason(occupant.vacate_notice_reason || '');
        setNoticeModalVisible(true);
    }, []);

    const handleConfirmScheduleVacate = useCallback(async () => {
        if (!selectedOccupant) return;
        if (!noticeDate) {
            showError('Please select a vacating date.');
            return;
        }

        try {
            setNoticeLoading(true);
            const res = await api.put(`/students/${selectedOccupant.student_id}`, {
                vacate_notice_date: noticeDate,
                vacate_notice_reason: noticeReason || null,
            });

            if (res.data?.success) {
                showSuccess(`Vacate scheduled on ${noticeDate} for ${selectedOccupant.first_name}!`);
                setNoticeModalVisible(false);
                // Optimistically update occupant state immediately
                setRoom((prev: any) => {
                    if (!prev || !prev.occupants) return prev;
                    return {
                        ...prev,
                        occupants: prev.occupants.map((occ: any) =>
                            occ.student_id === selectedOccupant.student_id
                                ? { ...occ, vacate_notice_date: noticeDate, vacate_notice_reason: noticeReason || null }
                                : occ
                        ),
                    };
                });
                triggerRefresh();
                fetchRoomDetails();
            } else {
                showError(res.data?.message || 'Failed to schedule vacate');
            }
        } catch (err: any) {
            showApiError(err, 'Failed to schedule vacate');
        } finally {
            setNoticeLoading(false);
        }
    }, [selectedOccupant, noticeDate, noticeReason, fetchRoomDetails, triggerRefresh, showError, showSuccess, showApiError]);

    const handleClearVacateNotice = useCallback(async () => {
        if (!selectedOccupant) return;
        try {
            setNoticeLoading(true);
            const res = await api.put(`/students/${selectedOccupant.student_id}`, {
                vacate_notice_date: null,
                vacate_notice_reason: null,
            });

            if (res.data?.success) {
                showSuccess(`Cleared vacate schedule for ${selectedOccupant.first_name}.`);
                setNoticeModalVisible(false);
                // Optimistically clear occupant vacate notice
                setRoom((prev: any) => {
                    if (!prev || !prev.occupants) return prev;
                    return {
                        ...prev,
                        occupants: prev.occupants.map((occ: any) =>
                            occ.student_id === selectedOccupant.student_id
                                ? { ...occ, vacate_notice_date: null, vacate_notice_reason: null }
                                : occ
                        ),
                    };
                });
                triggerRefresh();
                fetchRoomDetails();
            }
        } catch (err: any) {
            showApiError(err, 'Failed to clear vacate schedule');
        } finally {
            setNoticeLoading(false);
        }
    }, [selectedOccupant, fetchRoomDetails, triggerRefresh, showSuccess, showApiError]);

    const drawerFee = useMemo(() => {
        if (!selectedOccupant) return null;
        return {
            id: selectedOccupant.student_id,
            hostel_id: room?.hostel_id,
            name: `${selectedOccupant.first_name || ''} ${selectedOccupant.last_name || ''}`.trim(),
            first_name: selectedOccupant.first_name,
            last_name: selectedOccupant.last_name,
            room: room?.room_number || 'N/A',
            room_number: room?.room_number || 'N/A',
            dueAmount: parseFloat(selectedOccupant.due_amount || 0),
            paidAmount: parseFloat(selectedOccupant.paid_amount || 0),
            monthlyRent: parseFloat(room?.rent_per_bed || 0),
            carryForward: 0,
            feeMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
            rawDueDate: new Date().toISOString().split('T')[0],
        };
    }, [selectedOccupant, room]);

    const getInitials = (first: string, last: string) => {
        const f = first ? first.charAt(0).toUpperCase() : '';
        const l = last ? last.charAt(0).toUpperCase() : '';
        return (f + l).trim() || '?';
    };

    const parseVacateDate = (val: any): { dateStr: string; diffDays: number } | null => {
        if (!val) return null;
        let y: number = 0, m: number = 0, d: number = 0;
        let dateStr = '';

        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
            dateStr = val.substring(0, 10);
            const parts = dateStr.split('-');
            y = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10);
            d = parseInt(parts[2], 10);
        } else {
            const dt = new Date(val);
            if (isNaN(dt.getTime())) return null;
            y = dt.getFullYear();
            m = dt.getMonth() + 1;
            d = dt.getDate();
            dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }

        if (!y || !m || !d) return null;

        const today = new Date();
        const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const targetMid = new Date(y, m - 1, d).getTime();
        const diffDays = Math.round((targetMid - todayMid) / (1000 * 60 * 60 * 24));

        return { dateStr, diffDays };
    };

    // ── Occupant card ────────────────────────────────────────────────────────
    const OccupantCard = React.memo(({ item, onPress, onCall, onPay, onVacate }: {
        item: any;
        onPress: () => void;
        onCall: () => void;
        onPay: () => void;
        onVacate: () => void;
    }) => {
        const rawPhoto = item.profile_photo_url || item.photo || item.profile_photo;
        const photoUri = useMemo(() => getResolvedImageUrl(rawPhoto), [rawPhoto]);
        const [imageError, setImageError] = useState(false);

        useEffect(() => {
            setImageError(false);
        }, [rawPhoto, photoUri]);

        const vacateNotice = useMemo(() => {
            const parsed = parseVacateDate(item.vacate_notice_date);
            if (!parsed) return null;
            const { dateStr, diffDays } = parsed;

            let label = '';
            let shortBadge = '';
            let color = '#D97706';
            let bg = isDark ? '#451A03' : '#FEF3C7';
            let border = '#FDE68A';

            if (diffDays < 0) {
                const overdue = Math.abs(diffDays);
                label = `Vacate overdue by ${overdue} ${overdue === 1 ? 'day' : 'days'}`;
                shortBadge = `${overdue}d overdue`;
                color = '#DC2626';
                bg = isDark ? '#450A0A' : '#FEE2E2';
                border = '#FCA5A5';
            } else if (diffDays === 0) {
                label = 'Vacating Today';
                shortBadge = 'Today';
                color = '#EA580C';
                bg = isDark ? '#431407' : '#FFEDD5';
                border = '#FDBA74';
            } else if (diffDays === 1) {
                label = 'Vacating Tomorrow (1 day left)';
                shortBadge = '1 day left';
                color = '#D97706';
                bg = isDark ? '#451A03' : '#FEF3C7';
                border = '#FDE68A';
            } else {
                label = `Vacating in ${diffDays} days`;
                shortBadge = `${diffDays} days left`;
                color = '#D97706';
                bg = isDark ? '#451A03' : '#FEF3C7';
                border = '#FDE68A';
            }

            return {
                dateStr,
                diffDays,
                label,
                shortBadge,
                color,
                bg,
                border,
            };
        }, [item.vacate_notice_date, isDark]);

        return (
            <TouchableOpacity
                style={[styles.occupantCard, {
                    backgroundColor: theme.cardBg,
                    borderColor: vacateNotice ? (isDark ? '#78350F' : '#FDE68A') : (isDark ? '#334155' : '#EDE9FE'),
                }]}
                onPress={onPress}
                activeOpacity={0.8}
            >
                <View style={styles.occupantRow}>
                    {photoUri && !imageError ? (
                        <Image
                            source={{ uri: photoUri }}
                            style={styles.occupantAvatar}
                            fadeDuration={0}
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <View style={[styles.occupantAvatarPlaceholder, { backgroundColor: '#EDE9FE' }]}>
                            <Text style={[styles.avatarInitials, { color: '#7C3AED' }]}>
                                {getInitials(item.first_name, item.last_name)}
                            </Text>
                        </View>
                    )}
                    <View style={styles.occupantInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                            <Text style={[styles.occupantName, { color: theme.textPrimary, flex: 1 }]} numberOfLines={1}>
                                {item.first_name} {item.last_name || ''}
                            </Text>
                            {vacateNotice ? (
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 3,
                                    backgroundColor: vacateNotice.bg,
                                    borderColor: vacateNotice.border,
                                    borderWidth: 1,
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                    borderRadius: 6,
                                }}>
                                    <Clock size={10} color={vacateNotice.color} />
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: vacateNotice.color }}>
                                        {vacateNotice.shortBadge}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                        <Text style={[styles.occupantPhone, { color: theme.textSecondary }]}>
                            {item.phone || 'No phone'}
                        </Text>
                    </View>
                </View>

                {vacateNotice ? (
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: vacateNotice.bg,
                        borderColor: vacateNotice.border,
                        borderWidth: 1,
                        borderRadius: 8,
                        paddingHorizontal: 9,
                        paddingVertical: 5,
                        marginTop: 2,
                        marginBottom: 8,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
                            <Calendar size={12} color={vacateNotice.color} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: vacateNotice.color }} numberOfLines={1}>
                                {vacateNotice.label}
                            </Text>
                        </View>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: vacateNotice.color, opacity: 0.85, marginLeft: 4 }}>
                            {vacateNotice.dateStr}
                        </Text>
                    </View>
                ) : null}

                <View style={{ flexDirection: 'row', gap: 6, marginTop: vacateNotice ? 0 : 4, marginBottom: 4 }}>
                    <TouchableOpacity
                        style={[styles.callBtn, { backgroundColor: '#ECFDF5', flex: 1 }]}
                        onPress={onCall}
                        activeOpacity={0.7}
                    >
                        <Phone size={12} color="#10B981" />
                        <Text style={[styles.callText, { color: '#10B981' }]}>Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.callBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1, flex: 1 }]}
                        onPress={onPay}
                        activeOpacity={0.7}
                    >
                        <IndianRupee size={12} color="#2563EB" />
                        <Text style={[styles.callText, { color: '#2563EB' }]}>Pay</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.callBtn, {
                            backgroundColor: item.vacate_notice_date ? '#FEF3C7' : '#FFF7ED',
                            borderColor: item.vacate_notice_date ? '#FDE68A' : '#FFEDD5',
                            borderWidth: 1,
                            flex: 1.3
                        }]}
                        onPress={onVacate}
                        activeOpacity={0.7}
                    >
                        <Calendar size={12} color={item.vacate_notice_date ? '#D97706' : '#EA580C'} />
                        <Text style={[styles.callText, { color: item.vacate_notice_date ? '#D97706' : '#EA580C' }]} numberOfLines={1}>
                            {item.vacate_notice_date ? 'Edit Vacate' : 'Schedule Vacate'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    });

    // ── Beds visualizer ──────────────────────────────────────────────────────
    const BedsVisualizer = () => {
        const capacity = room.total_capacity || 0;
        const occupied = room.occupied_beds || 0;
        const beds = [];

        for (let i = 0; i < capacity; i++) {
            const isOccupied = i < occupied;
            const isSelected = selectedBedIndex === i;
            beds.push(
                <TouchableOpacity
                    key={i}
                    style={[
                        styles.bedItem,
                        {
                            backgroundColor: isOccupied
                                ? (isDark ? '#1E293B' : '#FFF0F0')
                                : (isDark ? '#1E293B' : '#F0FDF4'),
                            borderColor: isSelected
                                ? '#7C3AED'
                                : isOccupied
                                    ? '#FCA5A5'
                                    : '#86EFAC',
                            borderWidth: isSelected ? 2 : 1.5,
                        }
                    ]}
                    onPress={() => {
                        if (!isOccupied) return;
                        setSelectedBedIndex(prev => prev === i ? null : i);
                    }}
                    activeOpacity={isOccupied ? 0.7 : 1}
                >
                    <BedDouble
                        size={22}
                        color={isOccupied ? '#EF4444' : '#22C55E'}
                    />
                    <Text style={[styles.bedLabel, { color: theme.textPrimary }]}>Bed {i + 1}</Text>
                    <View style={[
                        styles.bedDot,
                        { backgroundColor: isOccupied ? '#EF4444' : '#22C55E' }
                    ]} />
                </TouchableOpacity>
            );
        }

        return (
            <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.cardIconWrap, { backgroundColor: '#EDE9FE' }]}>
                        <BedDouble size={18} color="#7C3AED" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Bed Layout & Allocation</Text>
                        <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                            Tap occupied bed to filter occupants
                        </Text>
                    </View>
                </View>

                {/* Legend */}
                <View style={styles.bedLegend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                        <Text style={[styles.legendText, { color: theme.textSecondary }]}>Occupied</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
                        <Text style={[styles.legendText, { color: theme.textSecondary }]}>Vacant</Text>
                    </View>
                </View>

                <View style={styles.bedsGrid}>{beds}</View>

                {selectedBedIndex !== null && (
                    <Text style={styles.bedHint}>
                        Showing occupant of Bed {selectedBedIndex + 1} · Tap again to show all
                    </Text>
                )}
            </View>
        );
    };

    // ── Loading / Error states ───────────────────────────────────────────────
    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? theme.background : '#F4F6FF' }]}>
                <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
                <AppHeader
                    title="Room Details"
                    subtitle="Loading..."
                />
                <View style={{ padding: 16, flex: 1 }}>
                    <SkeletonDetails />
                </View>
            </View>
        );
    }

    if (!room) {
        return (
            <View style={[styles.center, { backgroundColor: isDark ? theme.background : '#F4F6FF' }]}>
                <Text style={{ color: theme.textPrimary }}>Room not found</Text>
            </View>
        );
    }

    const hasVacantBeds = room.available_beds > 0;
    const occupancyPct = room.total_capacity > 0
        ? Math.round((room.occupied_beds / room.total_capacity) * 100)
        : 0;

    return (
        <View style={[styles.container, { backgroundColor: isDark ? theme.background : '#F4F6FF' }]}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <AppHeader
                title={`Room ${room.room_number}`}
                subtitle={room.room_type_name || 'Room Details'}
                rightComponent={
                    <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => navigation.navigate('AddRoom', { room, isEdit: true })}
                        activeOpacity={0.7}
                    >
                        <Edit3 color="#FFF" size={20} />
                    </TouchableOpacity>
                }
            />

            <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60 }}
                overScrollMode="never"
            >
                {/* ── Overview Stats Card ───────────────────────────── */}
                <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                    <View style={[styles.cardHeader, { justifyContent: 'space-between' }]}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIconWrap, { backgroundColor: hasVacantBeds ? '#ECFDF5' : '#FFF0F0' }]}>
                                <BedDouble size={18} color={hasVacantBeds ? '#10B981' : '#EF4444'} />
                            </View>
                            <View>
                                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                                    {room.room_type_name}
                                </Text>
                                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                                    Floor {room.floor_number || 0}
                                </Text>
                            </View>
                        </View>
                        <Badge
                            label={hasVacantBeds ? 'Available' : 'Full'}
                            variant={hasVacantBeds ? 'success' : 'error'}
                        />
                    </View>

                    {/* 4-stat row */}
                    <View style={[styles.statsRow, { borderTopColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                        <View style={styles.statItem}>
                            <IndianRupee size={16} color="#7C3AED" />
                            <Text style={[styles.statValue, { color: theme.textPrimary }]}>₹{room.rent_per_bed}</Text>
                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Monthly Rent</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                        <View style={styles.statItem}>
                            <BedDouble size={16} color="#7C3AED" />
                            <Text style={[styles.statValue, { color: theme.textPrimary }]}>{room.total_capacity}</Text>
                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Beds</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                        <View style={styles.statItem}>
                            <Users size={16} color={hasVacantBeds ? '#10B981' : '#EF4444'} />
                            <Text style={[styles.statValue, { color: hasVacantBeds ? '#10B981' : '#EF4444' }]}>
                                {room.available_beds}/{room.total_capacity}
                            </Text>
                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Available</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />
                        <View style={styles.statItem}>
                            <TrendingUp size={16} color="#F59E0B" />
                            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{occupancyPct}%</Text>
                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Occupancy</Text>
                        </View>
                    </View>

                    {/* Occupancy bar */}
                    <View style={styles.occupancyBarWrap}>
                        <View style={[styles.occupancyBar, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                            <View style={[
                                styles.occupancyFill,
                                {
                                    width: `${occupancyPct}%` as any,
                                    backgroundColor: occupancyPct >= 100 ? '#EF4444' : occupancyPct > 60 ? '#F59E0B' : '#10B981',
                                }
                            ]} />
                        </View>
                        <Text style={[styles.occupancyLabel, { color: theme.textSecondary }]}>
                            {room.occupied_beds} of {room.total_capacity} beds occupied
                        </Text>
                    </View>
                </View>

                {/* ── Beds Visualizer ──────────────────────────────── */}
                <View style={{ marginTop: 16 }}>
                    <BedsVisualizer />
                </View>

                {/* ── Amenities ────────────────────────────────────── */}
                {room.amenities && room.amenities.length > 0 && (
                    <View style={[styles.card, { backgroundColor: theme.cardBg, marginTop: 16 }]}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIconWrap, { backgroundColor: '#FFF7ED' }]}>
                                <Star size={18} color="#F59E0B" />
                            </View>
                            <View>
                                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Room Amenities</Text>
                                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                                    {room.amenities.length} amenities available
                                </Text>
                            </View>
                        </View>
                        <View style={styles.amenitiesGrid}>
                            {room.amenities.map((item: string, index: number) => {
                                const Icon = getAmenityIcon(item);
                                return (
                                    <View
                                        key={index}
                                        style={[styles.amenityChip, {
                                            backgroundColor: isDark ? '#1E293B' : '#F5F3FF',
                                            borderColor: isDark ? '#334155' : '#DDD6FE',
                                        }]}
                                    >
                                        <Icon size={13} color="#7C3AED" />
                                        <Text style={[styles.amenityChipText, { color: isDark ? '#C4B5FD' : '#7C3AED' }]}>{item}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* ── Current Occupants ─────────────────────────────── */}
                <View style={[styles.card, { backgroundColor: theme.cardBg, marginTop: 16 }]}>
                    <View style={[styles.cardHeader, { justifyContent: 'space-between' }]}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIconWrap, { backgroundColor: '#EFF6FF' }]}>
                                <Users size={18} color="#3B82F6" />
                            </View>
                            <View>
                                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                                    {selectedBedIndex !== null
                                        ? `Bed ${selectedBedIndex + 1} Occupant`
                                        : `Current Occupants`}
                                </Text>
                                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                                    {room.occupied_beds} tenant{room.occupied_beds !== 1 ? 's' : ''} staying
                                </Text>
                            </View>
                        </View>
                        {/* Add Tenant button */}
                        {hasVacantBeds && (
                            <TouchableOpacity
                                style={styles.addTenantBtn}
                                onPress={() => navigation.navigate('AddStudent', { roomId: room.room_id })}
                                activeOpacity={0.7}
                            >
                                <UserPlus size={14} color="#FFF" />
                                <Text style={styles.addTenantText}>Add Tenant</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {!room.occupants || room.occupants.length === 0 ? (
                        <View style={[styles.emptyOccupants, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
                            <Users size={32} color={isDark ? '#334155' : '#CBD5E1'} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Room is currently empty</Text>
                            {hasVacantBeds && (
                                <TouchableOpacity
                                    style={styles.addTenantBtnLarge}
                                    onPress={() => navigation.navigate('AddStudent', { roomId: room.room_id })}
                                    activeOpacity={0.7}
                                >
                                    <UserPlus size={15} color="#FFF" />
                                    <Text style={styles.addTenantText}>Add First Tenant</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <FlatList
                            data={
                                selectedBedIndex !== null
                                    ? (room.occupants.filter((o: any) =>
                                        String(o.bed_number) === String(selectedBedIndex + 1) ||
                                        String(o.bed_number) === `Bed ${selectedBedIndex + 1}` ||
                                        room.occupants.indexOf(o) === selectedBedIndex
                                      ).length > 0
                                        ? room.occupants.filter((o: any) =>
                                            String(o.bed_number) === String(selectedBedIndex + 1) ||
                                            String(o.bed_number) === `Bed ${selectedBedIndex + 1}` ||
                                            room.occupants.indexOf(o) === selectedBedIndex
                                          )
                                        : room.occupants)
                                    : room.occupants
                            }
                            renderItem={({ item }) => (
                                <OccupantCard
                                    item={item}
                                    onPress={() => navigation.navigate('StudentDetails', { studentId: item.student_id })}
                                    onCall={() => item.phone && Linking.openURL(`tel:${item.phone}`)}
                                    onPay={() => handleOpenPay(item)}
                                    onVacate={() => handleOpenScheduleVacate(item)}
                                />
                            )}
                            keyExtractor={item => item.student_id.toString()}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingRight: 4, paddingBottom: 4 }}
                            snapToInterval={width * 0.78 + 12}
                            decelerationRate="fast"
                        />
                    )}
                </View>
            </ScrollView>

            {/* ── Direct Payment Drawer ── */}
            <PaymentDrawer
                visible={payModalVisible}
                onClose={() => setPayModalVisible(false)}
                selectedFee={drawerFee}
                paymentModes={paymentModes}
                payAmount={payAmount}
                setPayAmount={setPayAmount}
                payNotes={payNotes}
                setPayNotes={setPayNotes}
                payTransactionId={payTransactionId}
                setPayTransactionId={setPayTransactionId}
                payDate={payDate}
                setPayDate={setPayDate}
                payDueDate={payDueDate}
                setPayDueDate={setPayDueDate}
                payModeId={payModeId}
                setPayModeId={setPayModeId}
                payReceiptNumber={payReceiptNumber}
                setPayReceiptNumber={setPayReceiptNumber}
                payReason={payReason}
                setPayReason={setPayReason}
                payLoading={payLoading}
                onConfirm={handleConfirmPayment}
                themeColor={theme.primary}
            />

            {/* ── Direct Schedule Vacate Drawer ── */}
            <ModalSheet
                visible={noticeModalVisible}
                onClose={() => {
                    if (!noticeLoading) {
                        setNoticeModalVisible(false);
                    }
                }}
            >
                <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                                Schedule Vacate Date
                            </Text>
                            <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                                {selectedOccupant?.first_name} {selectedOccupant?.last_name || ''} · Bed {selectedOccupant?.bed_number || ''}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => !noticeLoading && setNoticeModalVisible(false)}>
                            <X size={22} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={{ maxHeight: 380 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Notice banner */}
                        <View style={{ backgroundColor: '#FFFBEB', padding: 13, borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A', flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <Calendar size={18} color="#D97706" />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12.5, color: '#92400E', fontWeight: '700' }}>
                                    Planned Vacate Schedule
                                </Text>
                                <Text style={{ fontSize: 11.5, color: '#B45309', marginTop: 1 }}>
                                    The tenant remains active and allocated until final checkout and settlement.
                                </Text>
                            </View>
                        </View>

                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Expected Vacate Date *</Text>
                        <TouchableOpacity
                            style={[styles.inputContainer, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', justifyContent: 'space-between' }]}
                            onPress={() => setNoticeDatePickerVisible(true)}
                            activeOpacity={0.8}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Calendar size={16} color={theme.primary} />
                                <Text style={[styles.input, { color: theme.textPrimary }]}>{noticeDate}</Text>
                            </View>
                            <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '700' }}>Change</Text>
                        </TouchableOpacity>

                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Reason / Notes (Optional)</Text>
                        <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', height: 48 }]}>
                            <TextInput
                                style={[styles.input, { color: theme.textPrimary }]}
                                placeholder="e.g. Completed stay, course finished, job change..."
                                placeholderTextColor="#94A3B8"
                                value={noticeReason}
                                onChangeText={setNoticeReason}
                            />
                        </View>

                        <TouchableOpacity
                            style={{ backgroundColor: '#F59E0B', marginTop: 22, paddingVertical: 13, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                            onPress={handleConfirmScheduleVacate}
                            disabled={noticeLoading}
                            activeOpacity={0.8}
                        >
                            {noticeLoading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <Calendar size={16} color="#FFF" />
                                    <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>
                                        {selectedOccupant?.vacate_notice_date ? 'Update Vacate Schedule' : 'Schedule Vacate Date'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {selectedOccupant?.vacate_notice_date ? (
                            <TouchableOpacity
                                style={{ marginTop: 10, paddingVertical: 10, alignItems: 'center' }}
                                onPress={handleClearVacateNotice}
                                disabled={noticeLoading}
                            >
                                <Text style={{ color: '#EF4444', fontSize: 12.5, fontWeight: '600' }}>Cancel Vacate Notice</Text>
                            </TouchableOpacity>
                        ) : null}
                    </ScrollView>
                </View>
            </ModalSheet>

            {/* Date Picker Modal */}
            <DateTimePickerModal
                isVisible={noticeDatePickerVisible}
                mode="date"
                date={new Date(noticeDate || Date.now())}
                onConfirm={(d) => {
                    setNoticeDatePickerVisible(false);
                    setNoticeDate(toLocalDateStr(d));
                }}
                onCancel={() => setNoticeDatePickerVisible(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: { flex: 1 },
    editBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center', justifyContent: 'center',
    },

    // Card
    card: {
        borderRadius: 16,
        padding: 16,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    cardIconWrap: {
        width: 36, height: 36, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
    },
    cardTitle: { fontSize: 15, fontWeight: '700' },
    cardSubtitle: { fontSize: 11, fontWeight: '500', marginTop: 1 },

    // Stats
    statsRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        paddingTop: 14,
        marginBottom: 14,
        alignItems: 'center',
    },
    statItem: { flex: 1, alignItems: 'center', gap: 4 },
    statValue: { fontSize: 14, fontWeight: '800' },
    statLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
    statDivider: { width: 1, height: 36, marginHorizontal: 4 },

    // Occupancy bar
    occupancyBarWrap: { gap: 6 },
    occupancyBar: {
        height: 6, borderRadius: 3, overflow: 'hidden',
    },
    occupancyFill: { height: '100%', borderRadius: 3 },
    occupancyLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },

    // Beds
    bedLegend: { flexDirection: 'row', gap: 16, marginBottom: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, fontWeight: '600' },
    bedsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    bedItem: {
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        width: (width - 64 - 20) / 3,
        gap: 4,
        position: 'relative',
    },
    bedLabel: { fontSize: 11, fontWeight: '700' },
    bedDot: {
        position: 'absolute', top: 6, right: 6,
        width: 6, height: 6, borderRadius: 3,
    },
    bedHint: {
        fontSize: 11, color: '#7C3AED', fontWeight: '600',
        marginTop: 10, textAlign: 'center',
    },

    // Amenities
    amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    amenityChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1,
    },
    amenityChipText: { fontSize: 12, fontWeight: '600' },

    // Occupants
    emptyOccupants: {
        alignItems: 'center', justifyContent: 'center',
        padding: 28, borderRadius: 12, gap: 8,
    },
    emptyText: { fontSize: 13, fontWeight: '600' },
    occupantCard: {
        width: width * 0.78,
        borderRadius: 14,
        padding: 14,
        paddingBottom: 16,
        marginRight: 12,
        borderWidth: 1.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 2,
    },
    occupantRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    occupantAvatar: { width: 44, height: 44, borderRadius: 22 },
    occupantAvatarPlaceholder: {
        width: 44, height: 44, borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarInitials: { fontSize: 14, fontWeight: '800' },
    occupantInfo: { marginLeft: 10, flex: 1 },
    occupantName: { fontSize: 14, fontWeight: '700' },
    occupantPhone: { fontSize: 11, marginTop: 2, fontWeight: '500' },
    callBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 9, borderRadius: 10, gap: 5,
    },
    callText: { fontSize: 12, fontWeight: '700' },

    // Add Tenant buttons
    addTenantBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#7C3AED',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        gap: 5,
    },
    addTenantBtnLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#7C3AED',
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 12,
        gap: 6,
        marginTop: 10,
    },
    addTenantText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 12,
        marginBottom: 6,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 44,
    },
    input: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    },
});

export default RoomDetailsScreen;
