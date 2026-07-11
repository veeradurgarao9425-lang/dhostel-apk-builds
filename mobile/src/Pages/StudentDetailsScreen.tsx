import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
    ActivityIndicator,
    Image,
    Modal,
    TextInput,
    Alert,
    StatusBar,
    InteractionManager,
    Switch,
    Animated
} from 'react-native';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import {
    Phone, Mail, MapPin, Calendar, CreditCard,
    ChevronRight, User, Circle, IndianRupee, Clock,
    CheckCircle, X, Edit, Users, Receipt, MessageCircle, MessageSquare, Check
} from 'lucide-react-native';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { LinearGradient } from 'expo-linear-gradient';
import { FullScreenLoader } from '../components/FullScreenLoader';
import { useTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileMenu } from '../components/ProfileMenu';
import { SkeletonDetails } from '../components/ui/SkeletonDetails';
import { SkeletonList } from '../components/ui/SkeletonCard';
import { HeaderNotification } from '../components/HeaderNotification';
import { AppHeader } from '../components/AppHeader';
import { useFocusEffect } from '@react-navigation/native';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { PaymentDrawer } from '../components/PaymentDrawer';
import { useRefresh } from '../../contexts/RefreshContext';
import { ModalSheet } from '../components/FormComponents';


// ─── Sub-component: a single payment history row ──────────────────────────────
const PaymentHistoryItem = React.memo(({ payment, student, onPress }: { payment: any; student: any; onPress: (p: any) => void }) => {
    const { theme, isDark } = useTheme();
    return (
        <TouchableOpacity activeOpacity={0.8} onPress={() => onPress(payment)}>
            <Card style={[styles.historyCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9', borderWidth: isDark ? 1 : 0 }]}>
                <View style={styles.historyRow}>
                    <View style={styles.historyLeft}>
                        <View style={[styles.historyIcon, { backgroundColor: theme.success + '15' }]}>
                            <IndianRupee size={18} color={theme.success} />
                        </View>
                        <View>
                            <Text style={[styles.historyTitle, { color: theme.textPrimary }]}>{payment.fee_month || 'Payment'}</Text>
                            <Text style={[styles.historyDate, { color: theme.textSecondary }]}>
                                {new Date(payment.payment_date).toLocaleDateString()}
                            </Text>
                            <View style={styles.historyMetaRow}>
                                <Text style={[styles.historySubText, { color: theme.textSecondary }]}>
                                    {payment.payment_mode_name || 'Mode: N/A'}
                                </Text>
                                <View style={[styles.dot, { backgroundColor: isDark ? '#475569' : '#CBD5E1' }]} />
                                <Text style={[styles.historySubText, { color: theme.textSecondary }]}>
                                    {payment.receipt_number ? `RCP: ${payment.receipt_number}` : 'No Receipt'}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.historyRight}>
                        <Text style={[styles.historyAmount, { color: theme.textPrimary }]}>₹{payment.amount}</Text>
                        <View style={[styles.receiptAction, { backgroundColor: theme.primary + '15' }]}>
                            <Receipt size={14} color={theme.primary} />
                            <Text style={[styles.receiptActionText, { color: theme.primary }]}>Receipt</Text>
                        </View>
                    </View>
                </View>
            </Card>
        </TouchableOpacity>
    );
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
const StudentDetailsScreen = ({ route, navigation }: any) => {
    const { studentId } = route.params || {};
    const { theme, isDark } = useTheme();
    const { showError, showSuccess, showApiError } = useToast();
    const confirm = useConfirmation();
    const { triggerRefresh } = useRefresh();

    // Core student data (loaded immediately)
    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [avatarError, setAvatarError] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'payments'>('info');

    // Tab animation
    const tabAnim = useRef(new Animated.Value(0)).current; // 0 = info, 1 = payments
    const switchTab = useCallback((tab: 'info' | 'payments') => {
        setActiveTab(tab);
        Animated.spring(tabAnim, {
            toValue: tab === 'info' ? 0 : 1,
            useNativeDriver: false,
            tension: 120,
            friction: 10,
        }).start();
    }, [tabAnim]);

    const getInitials = (first: string, last: string) => {
        const f = first ? first.charAt(0).toUpperCase() : '';
        const l = last ? last.charAt(0).toUpperCase() : '';
        return (f + l).trim() || '?';
    };

    // Vacancy Notice state
    const [noticeModalVisible, setNoticeModalVisible] = useState(false);
    const [noticeDate, setNoticeDate] = useState(new Date().toISOString().split('T')[0]);
    const [noticeReason, setNoticeReason] = useState('');
    const [noticeDatePickerVisible, setNoticeDatePickerVisible] = useState(false);
    const [noticeSubmitLoading, setNoticeSubmitLoading] = useState(false);

    // Payment history (loaded after interaction completes — deferred)
    const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    // Payment modal state
    const [payModalVisible, setPayModalVisible] = useState(false);
    const [payAmount, setPayAmount] = useState('');
    const [payNotes, setPayNotes] = useState('');
    const [payTransactionId, setPayTransactionId] = useState('');
    const [payReceiptNumber, setPayReceiptNumber] = useState('');
    const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
    const [payDueDate, setPayDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [payModeId, setPayModeId] = useState('1');
    const [payReason, setPayReason] = useState('');
    const [paymentModes, setPaymentModes] = useState<any[]>([]);
    const [payLoading, setPayLoading] = useState(false);

    // Guard against concurrent fetches
    const isFetching = useRef(false);
    // Ensure the "allocate a room" popup shows only once per screen visit
    const roomPromptShownRef = useRef(false);

    // ── Navigate to edit/allocate a room for this tenant ──────────────────
    const goAllocateRoom = useCallback(() => {
        navigation.navigate('AddStudent', { student, isEdit: true });
    }, [navigation, student]);

    // ── Fetch core student info only (fast) ───────────────────────────────
    const fetchStudentDetails = useCallback(async () => {
        if (!studentId) {
            showError('No student ID provided');
            navigation.goBack();
            return;
        }
        if (isFetching.current) return;
        isFetching.current = true;

        try {
            setLoading(true);
            const response = await api.get(`/students/${studentId}`);
            if (response.data.success) {
                const data = response.data.data;
                // Separate payment history from core data so it can be rendered later
                const { payment_history, ...coreData } = data;

                // FIX: Compute virtual fee row if latest fee month is older than current month
                // This ensures StudentDetails matches PendingPayments exactly.
                if (coreData.pending_dues && coreData.pending_dues.length > 0) {
                    const dues = [...coreData.pending_dues].sort((a: any, b: any) => b.fee_month.localeCompare(a.fee_month));
                    const latest = dues[0];
                    const now = new Date();
                    const cmYear = now.getFullYear();
                    const cmMonth = now.getMonth() + 1;
                    const currentMonthStr = `${cmYear}-${String(cmMonth).padStart(2, '0')}`;
                    
                    if (latest.fee_month && latest.fee_month < currentMonthStr) {
                        const [ly, lm] = latest.fee_month.split('-').map(Number);
                        const gapMonths = (cmYear - ly) * 12 + (cmMonth - lm);
                        
                        if (gapMonths > 0) {
                            const rent = parseFloat(coreData.monthly_rent || 0);
                            const prevTotalDue = parseFloat(latest.total_due || 0);
                            const prevPaid = parseFloat(latest.paid_amount || 0);
                            
                            // Outstanding from older months + intermediate gap months (minus the current one)
                            const carryForward = Math.max(0, prevTotalDue - prevPaid) + Math.max(0, gapMonths - 1) * rent;
                            const newTotalDue = carryForward + rent;
                            
                            let newDueDate = new Date(cmYear, cmMonth - 1, new Date(latest.due_date || now).getDate());
                            if (newDueDate.getDate() !== new Date(latest.due_date || now).getDate()) {
                                newDueDate = new Date(cmYear, cmMonth, 0); // fallback to last day of month
                            }

                            const virtualDue = {
                                fee_id: 'virtual-' + currentMonthStr,
                                student_id: coreData.student_id,
                                fee_month: currentMonthStr,
                                monthly_rent: rent,
                                carry_forward: carryForward,
                                total_due: newTotalDue,
                                paid_amount: 0,
                                balance: newTotalDue,
                                fee_status: 'Pending',
                                due_date: newDueDate.toISOString()
                            };
                            
                            // Insert at beginning because dues is sorted descending
                            dues.unshift(virtualDue);
                            coreData.pending_dues = dues;
                        }
                    }
                }

                setStudent(coreData);

                // If this tenant has no room, prompt to allocate one (billing only starts
                // after allocation). Show it once per visit so it isn't nagging.
                if (!coreData.room_id && !roomPromptShownRef.current) {
                    roomPromptShownRef.current = true;
                    confirm({
                        title: 'No Room Allocated',
                        message: `${coreData.first_name || 'This tenant'} has no room yet. Allocate a room to start billing.`,
                        confirmText: 'Allocate Room',
                        cancelText: 'Later',
                        variant: 'warning',
                        onConfirm: () => navigation.navigate('AddStudent', { student: coreData, isEdit: true })
                    });
                }

                // Defer payment history rendering until after the screen is interactive.
                // This makes the profile card appear instantly.
                InteractionManager.runAfterInteractions(() => {
                    setPaymentHistory(payment_history || []);
                    setHistoryLoading(false);
                });
            }
        } catch (error: any) {
            console.error('Error fetching student details:', error);
            if (error.response?.status === 404) {
                showError('Student details not found.');
                navigation.goBack();
            } else {
                showApiError(error, 'Failed to fetch student details');
            }
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, [studentId, navigation]);

    // ── Fetch payment modes only when modal is about to open ─────────────
    // This avoids an extra API call on every screen mount.
    const fetchPaymentModes = useCallback(async () => {
        if (paymentModes.length > 0) return; // already loaded, skip
        try {
            const response = await api.get('/monthly-fees/payment-modes');
            if (response.data.success) {
                setPaymentModes(response.data.data);
                const first = response.data.data[0];
                if (first) {
                    setPayModeId((first.payment_mode_id || first.id).toString());
                }
            }
        } catch (error) {
            console.error('Error fetching payment modes:', error);
        }
    }, [paymentModes.length]);

    // ── Re-fetch when screen gains focus ──────────────────────────────────
    useFocusEffect(
        useCallback(() => {
            setHistoryLoading(true);
            fetchStudentDetails();
        }, [fetchStudentDetails])
    );



    // Calculate total outstanding balance from pending dues.
    // Only count dues that are due now (current month or earlier). Future months are
    // auto-created by the backend after a full payment, and counting them here would
    // keep "Pay Now" visible even though the tenant is up to date.
    // Calculate total outstanding balance from pending dues.
    // We only take the balance from the most recent month up to the current month,
    // because the backend carries forward the balance from older months into newer ones.
    const outstandingBalance = useMemo(() => {
        if (!student?.pending_dues?.length) return 0;
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const relevantDues = student.pending_dues
            .filter((due: any) => !due.fee_month || due.fee_month <= currentMonth)
            .sort((a: any, b: any) => b.fee_month.localeCompare(a.fee_month)); // Sort descending
        return relevantDues.length > 0 ? (parseFloat(relevantDues[0].balance) || 0) : 0;
    }, [student]);

    const overdueDays = useMemo(() => {
        if (!student?.pending_dues?.length) return null;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        let maxDays = 0;
        let isOverdue = false;
        
        for (const due of student.pending_dues) {
            if (due.due_date && parseFloat(due.balance) > 0) {
                const dueDate = new Date(due.due_date);
                dueDate.setHours(0, 0, 0, 0);
                const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / 86400000);
                if (diffDays > 0) {
                    isOverdue = true;
                    if (diffDays > maxDays) maxDays = diffDays;
                }
            }
        }
        return isOverdue ? maxDays : null;
    }, [student]);

    // ── Open payment modal ─────────────────────────────────────────────────
    const openPayModal = useCallback(() => {
        const monthlyRent = parseFloat(student?.monthly_rent || '0');
        // Default amount is the total outstanding balance, or just monthly rent if no dues (e.g. advance)
        const defaultAmount = outstandingBalance > 0 ? outstandingBalance : monthlyRent;

        setPayAmount(defaultAmount.toString());

        // Keep the original due date if they owe money (so they remain overdue)
        if (outstandingBalance > 0 && student?.pending_dues?.length > 0) {
            // Find the oldest unpaid due date
            const duesDesc = [...student.pending_dues].sort((a: any, b: any) => b.fee_month.localeCompare(a.fee_month));
            const latest = duesDesc[0];
            const rawDueDate = latest.due_date ? new Date(latest.due_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            setPayDueDate(rawDueDate);
        } else {
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            setPayDueDate(nextMonth.toISOString().split('T')[0]);
        }

        // Lazy-load payment modes only now
        fetchPaymentModes();
        setPayModalVisible(true);
    }, [student, outstandingBalance, fetchPaymentModes]);

    // ── Toggle Active / Inactive / Pre-booked status ────────────────────────
    const [statusLoading, setStatusLoading] = useState(false);

    const handleToggleStatus = useCallback(() => {
        if (!student) return;
        const currentStatus = student.status;
        let nextStatus = 0;
        let title = '';
        let message = '';
        let confirmText = '';
        let isDestructive = false;

        if (currentStatus === 1) {
            nextStatus = 0;
            title = 'Mark as Inactive?';
            message = "This tenant will be marked as inactive, and their room allocation will be cleared.";
            confirmText = 'Yes, mark Inactive';
            isDestructive = true;
        } else if (currentStatus === 2) {
            nextStatus = 1;
            title = 'Check In Tenant?';
            message = 'Activate this tenant, start billing, and allocate occupied bed from today?';
            confirmText = 'Yes, Check In';
        } else if (currentStatus === 3) {
            nextStatus = 1;
            title = 'Approve QR Signup?';
            message = 'Approve this tenant signup? They will be active and you will need to allocate a room to start billing.';
            confirmText = 'Approve & Check In';
        } else {
            nextStatus = 1;
            title = 'Mark as Active?';
            message = 'This tenant will be marked as active again.';
            confirmText = 'Yes, mark Active';
        }

        confirm({
            title,
            message,
            confirmText,
            cancelText: 'Cancel',
            variant: isDestructive ? 'danger' : 'info',
            onConfirm: async () => {
                try {
                    setStatusLoading(true);
                    const res = await api.put(`/students/${student.student_id}`, {
                        status: nextStatus
                    });
                    if (res.data.success) {
                        setStudent((prev: any) => ({ ...prev, status: nextStatus }));
                        showSuccess(`${student.first_name} is now ${nextStatus === 1 ? 'active' : 'inactive'}.`);
                        fetchStudentDetails(); // refresh details to sync billing fee histories
                        
                        // Automatically prompt for room allocation if approving a QR signup
                        if (currentStatus === 3 && nextStatus === 1) {
                            setTimeout(() => {
                                goAllocateRoom();
                            }, 500);
                        }
                    }
                } catch (e: any) {
                    showApiError(e, 'Failed to update status');
                } finally {
                    setStatusLoading(false);
                }
            }
        });
    }, [student, fetchStudentDetails, confirm, goAllocateRoom]);

    // ── Schedule Vacancy Notice ───────────────────────────────────────────
    const handleSetVacancyNotice = useCallback(async () => {
        if (!noticeDate) {
            showError('Please select a vacating date.');
            return;
        }
        try {
            setNoticeSubmitLoading(true);
            const res = await api.put(`/students/${studentId}`, {
                vacate_notice_date: noticeDate,
                vacate_notice_reason: noticeReason || null
            });
            if (res.data.success) {
                showSuccess(`Tenant vacating on ${noticeDate}`);
                setNoticeModalVisible(false);
                fetchStudentDetails();
            }
        } catch (e: any) {
            showApiError(e, 'Failed to set vacancy notice');
        } finally {
            setNoticeSubmitLoading(false);
        }
    }, [studentId, noticeDate, noticeReason, fetchStudentDetails]);

    // ── Clear Vacancy Notice ──────────────────────────────────────────────
    const handleClearVacancyNotice = useCallback(async () => {
        confirm({
            title: 'Cancel Vacancy Notice?',
            message: 'Are you sure you want to clear the scheduled vacate date?',
            confirmText: 'Yes, Clear Notice',
            cancelText: 'Cancel',
            variant: 'warning',
            onConfirm: async () => {
                try {
                    setLoading(true);
                    const res = await api.put(`/students/${studentId}`, {
                        vacate_notice_date: null,
                        vacate_notice_reason: null
                    });
                    if (res.data.success) {
                        showSuccess('Vacancy Notice Cancelled');
                        fetchStudentDetails();
                    }
                } catch (e: any) {
                    showApiError(e, 'Failed to clear vacancy notice');
                } finally {
                    setLoading(false);
                }
            }
        });
    }, [studentId, fetchStudentDetails, confirm]);

    // ── Submit payment ─────────────────────────────────────────────────────
    const handleRecordPayment = useCallback(async () => {
        if (!payAmount || isNaN(Number(payAmount)) || Number(payAmount) <= 0) {
            showError('Please enter a valid amount.');
            return;
        }

        try {
            setPayLoading(true);
            const payDateObj = new Date(payDate);

            // Default to current month based on payDate
            let feeMonth = `${payDateObj.getFullYear()}-${String(payDateObj.getMonth() + 1).padStart(2, '0')}`;

            // Intelligence: If student has pending dues, prioritize the oldest one
            if (student.pending_dues && student.pending_dues.length > 0) {
                // Sort by fee_month ascending to get oldest
                const sortedDues = [...student.pending_dues].sort((a: any, b: any) => a.fee_month.localeCompare(b.fee_month));
                feeMonth = sortedDues[0].fee_month;
            }

            const payload = {
                student_id: student.student_id,
                hostel_id: student.hostel_id,
                amount: parseFloat(payAmount),
                payment_date: payDate,
                due_date: payDueDate,
                payment_mode_id: parseInt(payModeId),
                transaction_id: payTransactionId || null,
                receipt_number: payReceiptNumber || null,
                notes: payNotes,
                reason: payReason || null,
                fee_month: feeMonth
            };

            const response = await api.post('/monthly-fees/record-payment', payload);
            if (response.data.success) {
                showSuccess('Payment recorded successfully!');
                setPayModalVisible(false);
                setPayAmount('');
                setPayNotes('');
                setPayTransactionId('');
                setPayReceiptNumber('');

                // Refresh student data AND trigger global dashboard refresh
                fetchStudentDetails();
                triggerRefresh();
            }
        } catch (error: any) {
            console.error('Payment error:', error);
            showApiError(error, 'Failed to record payment');
        } finally {
            setPayLoading(false);
        }
    }, [payAmount, payDate, payDueDate, payModeId, payTransactionId, payReceiptNumber,
        payNotes, payReason, student, fetchStudentDetails]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <FullScreenLoader visible={statusLoading} />

            <View pointerEvents={payModalVisible ? 'none' : 'auto'}>
                <AppHeader 
                    title="Tenant Details"
                    style={{ paddingTop: 65, paddingBottom: 26 }}
                    rightComponent={
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => navigation.navigate('AddStudent', { student, isEdit: true })}
                            >
                                <Edit color="#FFFFFF" size={20} />
                            </TouchableOpacity>
                            <HeaderNotification navigation={navigation} />
                            <ProfileMenu />
                        </View>
                    }
                />
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                overScrollMode="never"
                pointerEvents={payModalVisible ? 'none' : 'auto'}
            >
                {loading || !student ? (
                    <View style={styles.loadingContainer}>
                        <SkeletonDetails />
                    </View>
                ) : (
                    <>
                        {/* ── PAYMENT ALERT BANNER ─────────────────────────────────────── */}
                        {outstandingBalance > 0 && (() => {
                            const pendingDues = student?.pending_dues || [];
                            const now = new Date(); now.setHours(0,0,0,0);
                            const unpaidMonths = pendingDues.filter((d: any) => parseFloat(d.balance) > 0);
                            const isAnyOverdue = overdueDays !== null;
                            const bannerBg = isDark ? (isAnyOverdue ? '#3B1A1A' : '#1C1917') : (isAnyOverdue ? '#FEF2F2' : '#FFFBEB');
                            const bannerBorder = isAnyOverdue ? '#FCA5A5' : '#FCD34D';
                            const iconColor = isAnyOverdue ? '#DC2626' : '#D97706';
                            const iconBg = isDark ? (isAnyOverdue ? '#7F1D1D' : '#44200C') : (isAnyOverdue ? '#FEE2E2' : '#FEF3C7');
                            const titleColor = isDark ? (isAnyOverdue ? '#FECACA' : '#FDE68A') : (isAnyOverdue ? '#991B1B' : '#92400E');
                            const textColor = isDark ? (isAnyOverdue ? '#FCA5A5' : '#FCD34D') : (isAnyOverdue ? '#DC2626' : '#D97706');
                            return (
                                <View style={{ backgroundColor: bannerBg, borderColor: bannerBorder, borderWidth: 1, padding: 14, borderRadius: 12, marginBottom: 16 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: unpaidMonths.length > 0 ? 10 : 0 }}>
                                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                            <Ionicons name={isAnyOverdue ? 'warning' : 'time'} size={22} color={iconColor} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: titleColor, fontWeight: '800', fontSize: 15 }}>
                                                {isAnyOverdue ? `Payment Overdue — ${overdueDays} days` : 'Payment Due Soon'}
                                            </Text>
                                            <Text style={{ color: textColor, fontSize: 12, marginTop: 2 }}>
                                                Total outstanding: ₹{outstandingBalance.toLocaleString('en-IN')}
                                            </Text>
                                        </View>
                                    </View>
                                    {unpaidMonths.length > 0 && (
                                        <View style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)', borderRadius: 8, padding: 8 }}>
                                            {(() => {
                                                const latestDue = unpaidMonths.length > 0 
                                                    ? [...unpaidMonths].sort((a: any, b: any) => b.fee_month.localeCompare(a.fee_month))[0] 
                                                    : null;
                                                
                                                if (!latestDue) return null;

                                                const carryForward = parseFloat(latestDue.carry_forward || 0);
                                                const monthlyRent = parseFloat(latestDue.monthly_rent || latestDue.student_monthly_rent || 0);
                                                const paidAmount = parseFloat(latestDue.paid_amount || 0);

                                                return (
                                                    <View>
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                                                            <Text style={{ fontSize: 13, color: '#EF4444', fontWeight: '700' }}>Previous Overdue</Text>
                                                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#EF4444' }}>
                                                                ₹{carryForward.toLocaleString('en-IN')}
                                                            </Text>
                                                        </View>
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                                                            <Text style={{ fontSize: 13, color: textColor }}>This Month Rent</Text>
                                                            <Text style={{ fontSize: 13, fontWeight: '700', color: textColor }}>
                                                                ₹{monthlyRent.toLocaleString('en-IN')}
                                                            </Text>
                                                        </View>
                                                        {paidAmount > 0 && (
                                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, alignItems: 'center' }}>
                                                                <View style={[styles.feeStatusBadge, { backgroundColor: '#E6F9F3', marginRight: 6 }]}>
                                                                    <Text style={[styles.feeStatusBadgeText, { color: '#00B074' }]}>Paid</Text>
                                                                </View>
                                                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#10B981' }}>
                                                                    - ₹{paidAmount.toLocaleString('en-IN')}
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                );
                                            })()}
                                            <View style={{ borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', marginTop: 4, paddingTop: 4, flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={{ fontSize: 13, fontWeight: '800', color: titleColor }}>Total Outstanding:</Text>
                                                <Text style={{ fontSize: 13, fontWeight: '800', color: titleColor }}>
                                                    ₹{outstandingBalance.toLocaleString('en-IN')}
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            );
                        })()}

                        {/* ── Profile Hero Header ─────────────────────────────────────── */}
                        <Card style={[styles.profileCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                            <View style={styles.profileSection}>
                                <View style={styles.avatarWrapper}>
                                    {student.photo && !avatarError ? (
                                        <Image 
                                            source={{ uri: student.photo }} 
                                            style={styles.avatar} 
                                            onError={() => setAvatarError(true)}
                                        />
                                    ) : (
                                        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}>
                                            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.primary }}>
                                                {getInitials(student.first_name, student.last_name)}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={[styles.avatarStatusBadge, { backgroundColor: student.status === 1 ? theme.success : student.status === 2 ? theme.warning : student.status === 3 ? theme.primary : theme.error }]} />
                                </View>
                                
                                <View style={styles.profileInfo}>
                                    <View style={styles.nameRow}>
                                        <Text style={[styles.name, { color: theme.textPrimary }]} numberOfLines={1}>
                                            {student.first_name} {student.last_name || ''}
                                        </Text>
                                        <View style={[styles.activeStatusPill, { backgroundColor: student.status === 1 ? '#E6F9F3' : student.status === 2 ? '#FFF3E0' : student.status === 3 ? '#E0F2FE' : '#FFEBEE' }]}>
                                            <Text style={[styles.activeStatusPillText, { color: student.status === 1 ? '#00B074' : student.status === 2 ? '#FF9800' : student.status === 3 ? '#0EA5E9' : '#E53935' }]}>
                                                {student.status === 1 ? 'Active' : student.status === 2 ? 'Pre-Booked' : student.status === 3 ? 'Pending Approval' : 'Inactive'}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.roomInfo, { color: theme.textSecondary }]}>
                                        Room: {student.room_number || 'N/A'}{student.bed_number ? ` • Bed: ${student.bed_number}` : (student.bed_id ? ` • Bed: ${student.bed_id}` : '')}
                                    </Text>
                                    <View style={styles.cardBadgesRow}>
                                        <View style={[styles.cardBadge, { backgroundColor: outstandingBalance > 0 ? '#FFEBEE' : '#E6F9F3' }]}>
                                            {outstandingBalance > 0 ? (
                                                <X size={10} color="#E53935" />
                                            ) : (
                                                <Check size={10} color="#00B074" />
                                            )}
                                            <Text style={[styles.cardBadgeText, { color: outstandingBalance > 0 ? '#E53935' : '#00B074' }]}>
                                                {outstandingBalance > 0 ? 'Pending Payment' : 'Fully Paid'}
                                            </Text>
                                        </View>
                                        <View style={[styles.cardBadge, { backgroundColor: '#EDE9FF' }]}>
                                            <Calendar size={10} color="#5F2EEA" />
                                            <Text style={[styles.cardBadgeText, { color: '#5F2EEA' }]}>
                                                Since {student.admission_date ? new Date(student.admission_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.profileDivider} />

                            {/* ── Quick Action Row ── */}
                            <View style={styles.quickActionsRow}>
                                {/* CALL — directly opens dialer */}
                                <TouchableOpacity 
                                    style={styles.quickActionItem} 
                                    onPress={() => student.phone && Linking.openURL(`tel:${student.phone}`)}
                                    disabled={!student.phone}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.quickActionCircle, { backgroundColor: '#E3F2FD' }]}>
                                        <Phone size={16} color="#2196F3" />
                                    </View>
                                    <Text style={[styles.quickActionLabel, { color: theme.textPrimary }]}>Call</Text>
                                </TouchableOpacity>

                                {/* WHATSAPP — directly opens WhatsApp chat */}
                                <TouchableOpacity 
                                    style={styles.quickActionItem} 
                                    onPress={() => student.phone && Linking.openURL(`https://wa.me/91${student.phone}`)}
                                    disabled={!student.phone}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.quickActionCircle, { backgroundColor: '#E8F8F0' }]}>
                                        <MessageCircle size={16} color="#25D366" />
                                    </View>
                                    <Text style={[styles.quickActionLabel, { color: theme.textPrimary }]}>WhatsApp</Text>
                                </TouchableOpacity>

                                {/* MESSAGE — directly opens SMS app */}
                                <TouchableOpacity 
                                    style={styles.quickActionItem} 
                                    onPress={() => student.phone && Linking.openURL(`sms:${student.phone}`)}
                                    disabled={!student.phone}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.quickActionCircle, { backgroundColor: '#EDE9FF' }]}>
                                        <MessageSquare size={16} color="#5F2EEA" />
                                    </View>
                                    <Text style={[styles.quickActionLabel, { color: theme.textPrimary }]}>Message</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.quickActionItem} 
                                    onPress={() => {
                                        if (paymentHistory.length > 0) {
                                            const latest = paymentHistory[0];
                                            navigation.navigate('Receipt', {
                                                feeData: {
                                                    ...latest,
                                                    first_name: student.first_name,
                                                    last_name: student.last_name,
                                                    phone: student.phone,
                                                    room_number: student.room_number,
                                                    paid_amount: latest.amount,
                                                    fee_id: latest.payment_id || latest.id
                                                }
                                            });
                                        } else {
                                            showError('No payments recorded yet.');
                                        }
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.quickActionCircle, { backgroundColor: '#FFF3E0' }]}>
                                        <Receipt size={16} color="#FF9800" />
                                    </View>
                                    <Text style={[styles.quickActionLabel, { color: theme.textPrimary }]}>Receipt</Text>
                                </TouchableOpacity>
                            </View>
                        </Card>

                        {/* ── Active / Inactive Status Card ── */}
                        <Card style={[styles.actionCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                            <View style={styles.actionCardRow}>
                                <View style={[styles.actionCardIconCircle, { backgroundColor: student.status === 1 ? '#E6F9F3' : student.status === 2 ? '#FFF3E0' : student.status === 3 ? '#E0F2FE' : '#FFEBEE' }]}>
                                    <View style={[styles.actionStatusInnerDot, { backgroundColor: student.status === 1 ? '#00B074' : student.status === 2 ? '#FF9800' : student.status === 3 ? '#0EA5E9' : '#E53935' }]} />
                                </View>
                                <View style={styles.actionCardContent}>
                                    <Text style={[styles.actionCardTitle, { color: theme.textPrimary }]}>
                                        {student.status === 1 ? 'Active Tenant' : student.status === 2 ? 'Pre-Booked Tenant' : student.status === 3 ? 'Pending Application' : 'Inactive Tenant'}
                                    </Text>
                                    <Text style={[styles.actionCardSubtitle, { color: theme.textSecondary }]}>
                                        {student.status === 1 ? 'Tenant is currently active' : student.status === 2 ? 'Tenant is pre-booked' : student.status === 3 ? 'Tenant registered via QR, awaiting approval' : 'Tenant is currently inactive'}
                                    </Text>
                                </View>
                                {statusLoading ? (
                                    <ActivityIndicator size="small" color={theme.primary} />
                                ) : (
                                    <TouchableOpacity
                                        style={[
                                            styles.actionCardButton,
                                            {
                                                backgroundColor: student.status === 2 ? '#E6F9F3' : student.status === 3 ? '#E0F2FE' : student.status === 1 ? '#FFEBEE' : '#E6F9F3',
                                                borderColor: student.status === 2 ? '#E6F9F3' : student.status === 3 ? '#E0F2FE' : student.status === 1 ? '#FFEBEE' : '#E6F9F3',
                                            }
                                        ]}
                                        onPress={handleToggleStatus}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[
                                            styles.actionCardButtonText,
                                            { color: student.status === 2 ? '#00B074' : student.status === 3 ? '#0EA5E9' : student.status === 1 ? '#E53935' : '#00B074' }
                                        ]}>
                                            {student.status === 2 ? 'Check In' : student.status === 3 ? 'Approve' : student.status === 1 ? 'Deactivate' : 'Activate'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </Card>

                        {/* ── Vacancy Notice Card (Only for Active residents) ── */}
                        {student.status === 1 && (
                            <Card style={[styles.actionCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                <View style={styles.actionCardRow}>
                                    <View style={[styles.actionCardIconCircle, { backgroundColor: '#FFF3E0' }]}>
                                        <Calendar size={14} color="#FF9800" />
                                    </View>
                                    <View style={styles.actionCardContent}>
                                        <Text style={[styles.actionCardTitle, { color: theme.textPrimary }]}>Vacancy Notice</Text>
                                        <Text style={[styles.actionCardSubtitle, { color: theme.textSecondary }]}>
                                            {student.vacate_notice_date 
                                                ? `Leaving on: ${new Date(student.vacate_notice_date).toLocaleDateString()}` 
                                                : 'Schedule tenant checkout'}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[
                                            styles.actionCardButton,
                                            {
                                                backgroundColor: '#FFF3E0',
                                                borderColor: '#FFF3E0',
                                            }
                                        ]}
                                        onPress={() => {
                                            setNoticeDate(student.vacate_notice_date ? student.vacate_notice_date.split('T')[0] : new Date().toISOString().split('T')[0]);
                                            setNoticeReason(student.vacate_notice_reason || '');
                                            setNoticeModalVisible(true);
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.actionCardButtonText, { color: '#FF9800' }]}>
                                            {student.vacate_notice_date ? 'Modify Notice' : 'Schedule Vacate'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </Card>
                        )}

                        {/* ── No Room Allocated Banner ── */}
                        {!student.room_id && (
                            <Card style={styles.noRoomCard}>
                                <View style={styles.noticeHeader}>
                                    <View style={styles.noticeInfo}>
                                        <Text style={styles.noRoomTitle}>🚪 No Room Allocated</Text>
                                        <Text style={styles.noRoomText}>
                                            Billing starts only after a room is allocated. Allocate one to put this tenant on the rent roll.
                                        </Text>
                                    </View>
                                    <TouchableOpacity style={styles.noRoomBtn} onPress={goAllocateRoom} activeOpacity={0.85}>
                                        <Text style={styles.noRoomBtnText}>Allocate Room</Text>
                                    </TouchableOpacity>
                                </View>
                            </Card>
                        )}

                        {/* ── Vacancy Notice Banner (Only show if date set and NOT in Info tab check to avoid overlap) ── */}
                        {student.vacate_notice_date && (
                            <Card style={styles.noticeCard}>
                                <View style={styles.noticeHeader}>
                                    <View style={styles.noticeInfo}>
                                        <Text style={styles.noticeTitle}>⚠️ Vacate Date Scheduled</Text>
                                        <Text style={styles.noticeText}>
                                            Leaving on: <Text style={{ fontWeight: '700' }}>{new Date(student.vacate_notice_date).toLocaleDateString()}</Text>
                                        </Text>
                                        {student.vacate_notice_reason ? (
                                            <Text style={styles.noticeReason}>Reason: {student.vacate_notice_reason}</Text>
                                        ) : null}
                                    </View>
                                    <TouchableOpacity style={styles.noticeCancelBtn} onPress={handleClearVacancyNotice} activeOpacity={0.75}>
                                        <Text style={styles.noticeCancelText}>Cancel Notice</Text>
                                    </TouchableOpacity>
                                </View>
                            </Card>
                        )}

                        {/* ── Tab Switcher (animated pill) ── */}
                        <View style={[styles.tabContainer, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                            {/* Sliding pill indicator */}
                            <Animated.View
                                style={[
                                    styles.tabPill,
                                    {
                                        backgroundColor: theme.cardBg,
                                        left: tabAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['2%', '52%'],
                                        }),
                                        shadowColor: theme.primary,
                                    }
                                ]}
                            />
                            <TouchableOpacity
                                style={styles.tabButton}
                                onPress={() => switchTab('info')}
                                activeOpacity={0.8}
                            >
                                <View style={styles.tabInner}>
                                    <User size={14} color={activeTab === 'info' ? theme.primary : '#94A3B8'} />
                                    <Text style={[styles.tabButtonText, { color: activeTab === 'info' ? theme.primary : '#94A3B8', fontWeight: activeTab === 'info' ? '800' : '600' }]}>
                                        Details
                                    </Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.tabButton}
                                onPress={() => switchTab('payments')}
                                activeOpacity={0.8}
                            >
                                <View style={styles.tabInner}>
                                    <CreditCard size={14} color={activeTab === 'payments' ? theme.primary : '#94A3B8'} />
                                    <Text style={[styles.tabButtonText, { color: activeTab === 'payments' ? theme.primary : '#94A3B8', fontWeight: activeTab === 'payments' ? '800' : '600' }]}>
                                        Payments
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {activeTab === 'info' ? (
                            <>
                                {/* Contact & Location Card */}
                                <View style={[styles.infoSectionCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                    <View style={styles.infoSectionHeader}>
                                        <Phone size={14} color={theme.primary} />
                                        <Text style={[styles.infoSectionHeaderTitle, { color: theme.primary }]}>Contact & Location</Text>
                                    </View>
                                    <View style={styles.infoSectionBody}>
                                        {/* Phone Row — no action buttons here, top quick actions already cover it */}
                                        <View style={styles.infoRow}>
                                            <View style={[styles.infoRowIconCircle, { backgroundColor: '#E3F2FD' }]}>
                                                <Phone size={13} color="#2196F3" />
                                            </View>
                                            <View style={styles.infoRowText}>
                                                <Text style={styles.infoRowLabel}>Phone Number</Text>
                                                <Text style={[styles.infoRowValue, { color: theme.textPrimary }]}>{student.phone || 'N/A'}</Text>
                                            </View>
                                        </View>
                                        
                                        <View style={styles.infoRowDivider} />

                                        {/* Email Row */}
                                        <View style={styles.infoRow}>
                                            <View style={[styles.infoRowIconCircle, { backgroundColor: '#EDE9FF' }]}>
                                                <Mail size={13} color="#5F2EEA" />
                                            </View>
                                            <View style={styles.infoRowText}>
                                                <Text style={styles.infoRowLabel}>Email Address</Text>
                                                <Text style={[styles.infoRowValue, { color: theme.textPrimary }]} numberOfLines={1}>{student.email || 'N/A'}</Text>
                                            </View>
                                            {student.email && (
                                                <TouchableOpacity style={[styles.infoRowPillBtn, { backgroundColor: '#EDE9FF' }]} onPress={() => Linking.openURL(`mailto:${student.email}`)}>
                                                    <Mail size={10} color="#5F2EEA" />
                                                    <Text style={[styles.infoRowPillBtnText, { color: "#5F2EEA" }]}>Email</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        <View style={styles.infoRowDivider} />

                                        {/* Permanent Address Row */}
                                        <View style={styles.infoRow}>
                                            <View style={[styles.infoRowIconCircle, { backgroundColor: '#E8F8F0' }]}>
                                                <MapPin size={13} color="#00B074" />
                                            </View>
                                            <View style={styles.infoRowText}>
                                                <Text style={styles.infoRowLabel}>Permanent Address</Text>
                                                <Text style={[styles.infoRowValue, { color: theme.textPrimary }]}>{student.permanent_address || 'N/A'}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.infoRowDivider} />

                                        {/* Present / Working Address Row */}
                                        <View style={styles.infoRow}>
                                            <View style={[styles.infoRowIconCircle, { backgroundColor: '#FFF3E0' }]}>
                                                <MapPin size={13} color="#FF9800" />
                                            </View>
                                            <View style={styles.infoRowText}>
                                                <Text style={styles.infoRowLabel}>Present / Working Address</Text>
                                                <Text style={[styles.infoRowValue, { color: theme.textPrimary }]}>{student.present_working_address || 'N/A'}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                {/* Guardian Information Card */}
                                <View style={[styles.infoSectionCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                    <View style={styles.infoSectionHeader}>
                                        <User size={14} color={theme.primary} />
                                        <Text style={[styles.infoSectionHeaderTitle, { color: theme.primary }]}>Guardian Information</Text>
                                    </View>
                                    <View style={styles.infoSectionBody}>
                                        <View style={styles.infoRowGrid}>
                                            <View style={[styles.infoGridItem, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                                                <Text style={styles.infoRowLabel}>Guardian Name</Text>
                                                <Text style={[styles.infoRowValue, { color: theme.textPrimary }]}>{student.guardian_name || 'N/A'}</Text>
                                            </View>
                                            <View style={[styles.infoGridItem, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                                                <Text style={styles.infoRowLabel}>Relationship</Text>
                                                <Text style={[styles.infoRowValue, { color: theme.textPrimary }]}>{student.guardian_relation_name || student.guardian_relation || 'N/A'}</Text>
                                            </View>
                                        </View>

                                        <View style={[styles.infoRow, { marginTop: 12 }]}>
                                            <View style={styles.infoRowText}>
                                                <Text style={styles.infoRowLabel}>Guardian Phone</Text>
                                                <Text style={[styles.infoRowValue, { color: theme.textPrimary }]}>{student.guardian_phone || 'N/A'}</Text>
                                            </View>
                                            {student.guardian_phone && (
                                                <TouchableOpacity style={[styles.infoRowPillBtn, { backgroundColor: '#E3F2FD' }]} onPress={() => Linking.openURL(`tel:${student.guardian_phone}`)}>
                                                    <Phone size={10} color="#2196F3" />
                                                    <Text style={[styles.infoRowPillBtnText, { color: "#2196F3" }]}>Call Guardian</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                </View>

                                {/* Personal & Identity Card */}
                                <View style={[styles.infoSectionCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                    <View style={styles.infoSectionHeader}>
                                        <CreditCard size={14} color={theme.primary} />
                                        <Text style={[styles.infoSectionHeaderTitle, { color: theme.primary }]}>Personal & Identity</Text>
                                    </View>
                                    <View style={styles.infoSectionBody}>
                                        <View style={styles.infoRowGrid}>
                                            <View style={[styles.infoGridItem, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                                                <Text style={styles.infoRowLabel}>Gender</Text>
                                                <Text style={[styles.infoRowValue, { color: theme.textPrimary }]}>{student.gender || 'N/A'}</Text>
                                            </View>
                                            <View style={[styles.infoGridItem, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                                                <Text style={styles.infoRowLabel}>Date of Birth</Text>
                                                <Text style={[styles.infoRowValue, { color: theme.textPrimary }]}>
                                                    {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={[styles.infoRow, { marginTop: 12 }]}>
                                            <View style={styles.infoRowText}>
                                                <Text style={styles.infoRowLabel}>ID Proof Type</Text>
                                                <Text style={[styles.infoRowValue, { color: theme.textPrimary }]}>
                                                    {student.id_proof_type_name
                                                        ? `${student.id_proof_type_name} · ${student.id_proof_number || 'N/A'}`
                                                        : student.id_proof_number || 'N/A'}
                                                </Text>
                                            </View>
                                            {student.id_proof_number && (
                                                <View style={[styles.verificationBadge, { backgroundColor: '#E6F9F3' }]}>
                                                    <CheckCircle size={14} color="#00B074" />
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>

                                {/* Hostel Registration Card */}
                                <View style={[styles.infoSectionCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                    <View style={styles.infoSectionHeader}>
                                        <Calendar size={14} color={theme.primary} />
                                        <Text style={[styles.infoSectionHeaderTitle, { color: theme.primary }]}>Hostel Registration</Text>
                                    </View>
                                    <View style={styles.infoSectionBody}>
                                        <View style={[styles.infoRowGrid, { marginBottom: 12 }]}>
                                            <View style={[styles.infoGridItem, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                                                <Text style={styles.infoRowLabel}>Allocated Room</Text>
                                                <Text style={[styles.infoRowValue, { color: theme.textPrimary, fontWeight: '800' }]}>
                                                    Room {student.room_number || 'N/A'}
                                                </Text>
                                            </View>
                                            <View style={[styles.infoGridItem, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                                                <Text style={styles.infoRowLabel}>Allocated Bed</Text>
                                                <Text style={[styles.infoRowValue, { color: theme.textPrimary, fontWeight: '800' }]}>
                                                    Bed {student.bed_number || student.bed_id || 'N/A'}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.infoRowGrid}>
                                            <View style={[styles.infoGridItem, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                                                <Text style={styles.infoRowLabel}>Admission Date</Text>
                                                <Text style={[styles.infoRowValue, { color: theme.textPrimary }]}>
                                                    {student.admission_date ? new Date(student.admission_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                                </Text>
                                            </View>
                                            <View style={[styles.infoGridItem, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                                                <Text style={styles.infoRowLabel}>Monthly Rent</Text>
                                                <Text style={[styles.infoRowValue, { color: theme.primary, fontWeight: '800' }]}>
                                                    ₹{student.monthly_rent || 0}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={[styles.infoRow, { marginTop: 12 }]}>
                                            <View style={styles.infoRowText}>
                                                <Text style={styles.infoRowLabel}>Admission Fee</Text>
                                                <Text style={[styles.infoRowValue, { color: theme.textPrimary }]}>
                                                    ₹{student.admission_fee || 0}
                                                </Text>
                                            </View>
                                            <View style={[styles.feeStatusBadge, { backgroundColor: student.admission_status === 1 ? '#E6F9F3' : '#FFEBEE' }]}>
                                                <Text style={[styles.feeStatusBadgeText, { color: student.admission_status === 1 ? '#00B074' : '#E53935' }]}>
                                                    {student.admission_status === 1 ? 'Paid' : 'Unpaid'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                {/* ── Timeline Card (Appended inside Info Details) ── */}
                                <Card style={[styles.timelineCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                    <View style={styles.infoSectionHeader}>
                                        <Clock size={14} color={theme.primary} />
                                        <Text style={[styles.infoSectionHeaderTitle, { color: theme.primary }]}>History Timeline</Text>
                                    </View>
                                    <View style={styles.timelineContainer}>
                                        {/* Event 3+: Payments (Most Recent First) */}
                                        {[...paymentHistory].reverse().map((payment: any, index: number) => (
                                            <TouchableOpacity 
                                                key={`timeline-pay-${index}`} 
                                                activeOpacity={0.7} 
                                                onPress={() => navigation.navigate('Receipt', { 
                                                    feeData: {
                                                        ...payment,
                                                        first_name: student.first_name,
                                                        last_name: student.last_name,
                                                        phone: student.phone,
                                                        room_number: student.room_number,
                                                        paid_amount: payment.amount,
                                                        fee_id: payment.payment_id || payment.id
                                                    }
                                                })}
                                            >
                                                <View style={styles.timelineItem}>
                                                    <View style={styles.timelineLine} />
                                                    <View style={[styles.timelineDot, { backgroundColor: '#00B074' }]}>
                                                        <IndianRupee size={10} color="#FFF" />
                                                    </View>
                                                    <View style={styles.timelineContent}>
                                                        <Text style={[styles.timelineEventTitle, { color: theme.textPrimary }]}>
                                                            Rent Payment Recorded ({payment.fee_month || 'Payment'})
                                                        </Text>
                                                        <Text style={[styles.timelineEventDate, { color: theme.textSecondary }]}>
                                                            {new Date(payment.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </Text>
                                                        <Text style={[styles.timelineEventDesc, { color: theme.textSecondary }]}>
                                                            Recorded payment of ₹{payment.amount} via {payment.payment_mode_name || 'N/A'}. {payment.receipt_number ? `Receipt No: ${payment.receipt_number}` : ''}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        ))}

                                        {/* Event 2: Vacancy Notice (If exists) */}
                                        {student.vacate_notice_date && (
                                            <View style={styles.timelineItem}>
                                                <View style={styles.timelineLine} />
                                                <View style={[styles.timelineDot, { backgroundColor: '#FF9800' }]}>
                                                    <Calendar size={10} color="#FFF" />
                                                </View>
                                                <View style={styles.timelineContent}>
                                                    <Text style={[styles.timelineEventTitle, { color: theme.textPrimary }]}>Vacancy Notice Scheduled</Text>
                                                    <Text style={[styles.timelineEventDate, { color: theme.textSecondary }]}>
                                                        {new Date(student.vacate_notice_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </Text>
                                                    <Text style={[styles.timelineEventDesc, { color: theme.textSecondary }]}>
                                                        Tenant scheduled to check out. {student.vacate_notice_reason ? `Reason: ${student.vacate_notice_reason}` : ''}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}

                                        {/* Event 1: Admission (Oldest, so Last) */}
                                        <View style={styles.timelineItem}>
                                            <View style={styles.timelineLine} />
                                            <View style={[styles.timelineDot, { backgroundColor: theme.primary }]}>
                                                <User size={10} color="#FFF" />
                                            </View>
                                            <View style={styles.timelineContent}>
                                                <Text style={[styles.timelineEventTitle, { color: theme.textPrimary }]}>Registered & Admitted</Text>
                                                <Text style={[styles.timelineEventDate, { color: theme.textSecondary }]}>
                                                    {student.admission_date ? new Date(student.admission_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                                </Text>
                                                <Text style={[styles.timelineEventDesc, { color: theme.textSecondary }]}>
                                                    Admitted to room {student.room_number || 'N/A'} with monthly rent of ₹{student.monthly_rent || 0} and admission fee of ₹{student.admission_fee || 0}.
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </Card>
                            </>
                        ) : (
                            <>
                                {/* ── Balance & Quick Pay ───────────────────────────────── */}
                                <Card style={[styles.rentCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9', borderWidth: isDark ? 1 : 0 }]}>
                                    <View style={styles.rentHeader}>
                                        <View>
                                            <Text style={[styles.rentLabel, { color: theme.textSecondary }]}>Total Outstanding Balance</Text>
                                            <Text style={[styles.rentValue, { color: outstandingBalance > 0 ? theme.error : theme.success }]}>
                                                ₹{outstandingBalance}
                                            </Text>
                                        </View>
                                        {outstandingBalance > 0 && (
                                            <TouchableOpacity style={[styles.payButton, { backgroundColor: theme.primary }]} onPress={openPayModal}>
                                                <Text style={styles.payButtonText}>Pay Now</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </Card>

                                {/* ── Payment History (deferred render) ────────────────── */}
                                <Text style={styles.sectionTitle}>Payment History</Text>
                                {historyLoading ? (
                                    <SkeletonList count={2} />
                                ) : paymentHistory.length > 0 ? (
                                    paymentHistory.map((payment: any, index: number) => (
                                        <PaymentHistoryItem
                                            key={`${payment.payment_id || 'pay'}-${index}`}
                                            payment={payment}
                                            student={student}
                                            onPress={(pay) => navigation.navigate('Receipt', {
                                                feeData: {
                                                    ...pay,
                                                    first_name: student.first_name,
                                                    last_name: student.last_name,
                                                    phone: student.phone,
                                                    room_number: student.room_number,
                                                    paid_amount: pay.amount,
                                                    fee_id: pay.payment_id || pay.id
                                                }
                                            })}
                                        />
                                    ))
                                ) : (
                                    <Card style={styles.emptyHistoryCard}>
                                        <Clock size={32} color="#CBD5E1" />
                                        <Text style={styles.emptyHistoryText}>No payment history found</Text>
                                    </Card>
                                )}
                            </>
                        )}
                    </>
                )}
            </ScrollView>

            {/* ── Payment Modal (shared PaymentDrawer component) ── */}
            <PaymentDrawer
                visible={payModalVisible}
                onClose={() => setPayModalVisible(false)}
                selectedFee={student ? {
                    first_name: student.first_name,
                    last_name: student.last_name,
                    room_number: student.room_number || 'N/A',
                    pending_dues: student.pending_dues
                } : null}
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
                onConfirm={handleRecordPayment}
                themeColor={theme.primary}
            />

            {/* ── Vacancy Notice Modal ─────────────────────────────────────── */}
            <ModalSheet
                visible={noticeModalVisible}
                onClose={() => setNoticeModalVisible(false)}
            >
                <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Schedule Vacate Date</Text>
                        <TouchableOpacity onPress={() => setNoticeModalVisible(false)}>
                            <X size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        <Text style={styles.inputLabel}>Expected Vacate Date *</Text>
                        <TouchableOpacity
                            style={styles.dateSelector}
                            onPress={() => setNoticeDatePickerVisible(true)}
                        >
                            <Calendar size={18} color={theme.primary} />
                            <Text style={styles.dateText}>{noticeDate}</Text>
                        </TouchableOpacity>

                        <Text style={[styles.inputLabel, { marginTop: 16 }]}>Reason / Notes (Optional)</Text>
                        <TextInput
                            style={[styles.notesInput, { height: 80 }]}
                            value={noticeReason}
                            onChangeText={setNoticeReason}
                            multiline={true}
                            placeholder="e.g. Completed course, moving away..."
                            textAlignVertical="top"
                        />

                        <TouchableOpacity
                            style={[styles.submitButton, { backgroundColor: '#F59E0B' }, noticeSubmitLoading && styles.disabledButton]}
                            onPress={handleSetVacancyNotice}
                            disabled={noticeSubmitLoading}
                        >
                            {noticeSubmitLoading
                                ? <ActivityIndicator color="#FFF" />
                                : <Text style={styles.submitButtonText}>Schedule Vacate</Text>
                            }
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </ModalSheet>

            <DateTimePickerModal
                isVisible={noticeDatePickerVisible}
                mode="date"
                date={new Date(noticeDate)}
                minimumDate={new Date()}
                onConfirm={(date) => {
                    setNoticeDate(date.toISOString().split('T')[0]);
                    setNoticeDatePickerVisible(false);
                }}
                onCancel={() => setNoticeDatePickerVisible(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { paddingTop: 55, paddingBottom: 30, paddingHorizontal: 20 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    actionButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    headerContent: { marginTop: 4 },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
    content: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 120 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },

    /* ── Profile Card ── */
    profileCard: { marginBottom: 14, padding: 16, borderRadius: 16, borderWidth: 1, elevation: 2, shadowColor: '#5F2EEA', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
    profileSection: { flexDirection: 'row', alignItems: 'center' },
    avatarWrapper: { position: 'relative', marginRight: 14 },
    avatar: { width: 64, height: 64, borderRadius: 32 },
    avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#E2E8F0' },
    avatarStatusBadge: { width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: '#FFF', position: 'absolute', bottom: 1, right: 1 },
    profileInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 3 },
    name: { fontSize: 17, fontWeight: '700', color: '#1E293B', flexShrink: 1 },
    activeStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    activeStatusPillText: { fontSize: 10, fontWeight: '700' },
    roomInfo: { fontSize: 13, color: '#64748B', marginBottom: 6, fontWeight: '500' },
    cardBadgesRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    cardBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    cardBadgeText: { fontSize: 10, fontWeight: '600' },
    profileDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 14 },

    /* ── Quick Actions ── */
    quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
    quickActionItem: { alignItems: 'center', flex: 1, gap: 5 },
    quickActionCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    quickActionLabel: { fontSize: 10, fontWeight: '600', color: '#64748B' },

    /* ── Action Cards (Status / Vacancy) ── */
    actionCard: { marginBottom: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
    actionCardRow: { flexDirection: 'row', alignItems: 'center' },
    actionCardIconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    actionStatusInnerDot: { width: 10, height: 10, borderRadius: 5 },
    actionCardContent: { flex: 1, marginRight: 8 },
    actionCardTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
    actionCardSubtitle: { fontSize: 12, color: '#64748B', lineHeight: 16 },
    actionCardButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 0 },
    actionCardButtonText: { fontSize: 12, fontWeight: '700' },

    /* ── No Room / Notice Banners ── */
    noRoomCard: { marginBottom: 12, backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, padding: 14, borderRadius: 12 },
    noRoomTitle: { fontSize: 14, fontWeight: '700', color: '#DC2626', marginBottom: 4 },
    noRoomText: { fontSize: 12, color: '#B91C1C', fontWeight: '500', lineHeight: 17 },
    noRoomBtn: { backgroundColor: '#DC2626', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: 10 },
    noRoomBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
    noticeCard: { marginBottom: 12, backgroundColor: '#FFFBEB', borderColor: '#FEF3C7', borderWidth: 1, padding: 14, borderRadius: 12 },
    noticeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    noticeInfo: { flex: 1, marginRight: 10 },
    noticeTitle: { fontSize: 14, fontWeight: '700', color: '#D97706', marginBottom: 3 },
    noticeText: { fontSize: 12, color: '#B45309', fontWeight: '500', lineHeight: 17 },
    noticeReason: { fontSize: 11, color: '#B45309', marginTop: 3, fontStyle: 'italic' },
    noticeCancelBtn: { backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B' },
    noticeCancelText: { color: '#D97706', fontWeight: '700', fontSize: 12 },

    /* ── Tab Bar (animated pill) ── */
    tabContainer: { flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: 16, position: 'relative', borderWidth: 1 },
    tabPill: { position: 'absolute', top: 4, bottom: 4, width: '46%', borderRadius: 10, elevation: 2, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
    tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, zIndex: 1 },
    tabInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tabButtonText: { fontSize: 13, fontWeight: '600' },

    /* ── Info Section Cards ── */
    infoSectionCard: { borderRadius: 20, marginBottom: 16, overflow: 'hidden', borderWidth: 1 },
    infoSectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'rgba(99, 102, 241, 0.05)', gap: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(99, 102, 241, 0.1)' },
    infoSectionHeaderTitle: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    infoSectionBody: { flexDirection: 'column', gap: 0, padding: 20 },

    /* ── Info Rows ── */
    infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    infoRowIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    infoRowText: { flex: 1 },
    infoRowLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
    infoRowValue: { fontSize: 15, fontWeight: '700', lineHeight: 22 },
    infoRowActions: { flexDirection: 'row', gap: 6 },
    infoRowActionIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    infoRowPillBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    infoRowPillBtnText: { fontSize: 11, fontWeight: '700' },
    infoRowDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginLeft: 56, marginVertical: 8 },

    /* ── Info Grid (2-column) ── */
    infoRowGrid: { flexDirection: 'row', gap: 10 },
    infoGridItem: { flex: 1, borderRadius: 10, padding: 12, borderWidth: 1 },

    /* ── Badges ── */
    verificationBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    feeStatusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    feeStatusBadgeText: { fontSize: 11, fontWeight: '700' },

    /* ── Timeline ── */
    timelineCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
    timelineContainer: { marginTop: 10, paddingLeft: 2 },
    timelineItem: { flexDirection: 'row', marginBottom: 16, position: 'relative' },
    timelineLine: { position: 'absolute', left: 11, top: 24, bottom: -16, width: 1.5, backgroundColor: '#E2E8F0' },
    timelineDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10, zIndex: 1 },
    timelineContent: { flex: 1, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
    timelineEventTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
    timelineEventDate: { fontSize: 11, fontWeight: '500', marginBottom: 3, color: '#64748B' },
    timelineEventDesc: { fontSize: 12, lineHeight: 17, color: '#64748B' },

    /* ── Payment / Rent Card ── */
    rentCard: { marginBottom: 14, padding: 16, borderRadius: 12 },
    rentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rentLabel: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
    rentValue: { fontSize: 22, fontWeight: '800' },
    payButton: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
    payButtonText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 10, marginTop: 4 },

    /* ── Payment History Cards ── */
    historyCard: { marginBottom: 10, padding: 14, borderRadius: 12 },
    historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    historyIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    historyTitle: { fontSize: 13, fontWeight: '700' },
    historyDate: { fontSize: 11, marginTop: 2, color: '#64748B' },
    historyMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
    dot: { width: 3, height: 3, borderRadius: 1.5, marginHorizontal: 5 },
    historySubText: { fontSize: 11, color: '#64748B' },
    historyRight: { alignItems: 'flex-end' },
    historyAmount: { fontSize: 15, fontWeight: '700' },
    receiptAction: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    receiptActionText: { fontSize: 10, fontWeight: '700' },
    emptyHistoryCard: { padding: 30, alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12 },
    emptyHistoryText: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },

    /* ── Modals ── */
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, width: '100%', maxHeight: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
    modalBody: { gap: 8 },
    inputLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 4 },
    notesInput: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 14, fontSize: 14, color: '#1E293B' },
    submitButton: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
    disabledButton: { backgroundColor: '#FF6B6B80' },
    submitButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
    row: { flexDirection: 'row', marginTop: 10 },
    dateSelector: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F1F5F9', padding: 12, borderRadius: 10, marginTop: 4 },
    dateText: { fontSize: 14, color: '#1E293B', fontWeight: '600' },
    verticalModeContainer: { flexDirection: 'column', gap: 6, marginTop: 6 },
    modeListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
    modeListItemActive: { backgroundColor: '#FFF1F1', borderColor: '#FF6B6B' },
    modeListItemText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
    modeListItemTextActive: { color: '#FF6B6B', fontWeight: '700' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 68 },
    amountInput: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 14, fontSize: 16, fontWeight: '600', color: '#1E293B' }
});

export default StudentDetailsScreen;