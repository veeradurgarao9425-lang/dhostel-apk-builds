import React, { useState, useCallback, useRef, useMemo } from 'react';
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
    Switch
} from 'react-native';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import {
    Phone, Mail, MapPin, Calendar, CreditCard,
    ChevronRight, User, Circle, IndianRupee, Clock,
    CheckCircle, X, Edit, Users, Receipt
} from 'lucide-react-native';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import api from '../services/api';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { ProfileMenu } from '../components/ProfileMenu';
import { HeaderNotification } from '../components/HeaderNotification';
import { AppHeader } from '../components/AppHeader';
import { useFocusEffect } from '@react-navigation/native';

// ─── Sub-component: a single detail row ──────────────────────────────────────
// Extracted & memoized — only re-renders when its own props change.
const DetailItem = React.memo(({ icon, label, value, onPress }: any) => (
    <TouchableOpacity
        style={styles.detailItem}
        disabled={!onPress}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
    >
        <View style={styles.iconContainer}>{icon}</View>
        <View style={styles.detailText}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value || 'N/A'}</Text>
        </View>
        {onPress && <ChevronRight size={20} color="#94A3B8" />}
    </TouchableOpacity>
));

// ─── Sub-component: a single payment history row ──────────────────────────────
const PaymentHistoryItem = React.memo(({ payment, student, onPress }: { payment: any; student: any; onPress: (p: any) => void }) => (
    <TouchableOpacity activeOpacity={0.8} onPress={() => onPress(payment)}>
        <Card style={styles.historyCard}>
            <View style={styles.historyRow}>
                <View style={styles.historyLeft}>
                    <View style={styles.historyIcon}>
                        <IndianRupee size={18} color="#4CAF50" />
                    </View>
                    <View>
                        <Text style={styles.historyTitle}>{payment.fee_month || 'Payment'}</Text>
                        <Text style={styles.historyDate}>
                            {new Date(payment.payment_date).toLocaleDateString()}
                        </Text>
                        <View style={styles.historyMetaRow}>
                            <Text style={styles.historySubText}>
                                {payment.payment_mode_name || 'Mode: N/A'}
                            </Text>
                            <View style={styles.dot} />
                            <Text style={styles.historySubText}>
                                {payment.receipt_number ? `RCP: ${payment.receipt_number}` : 'No Receipt'}
                            </Text>
                        </View>
                    </View>
                </View>
                <View style={styles.historyRight}>
                    <Text style={styles.historyAmount}>₹{payment.amount}</Text>
                    <View style={styles.receiptAction}>
                        <Receipt size={14} color="#FF6B6B" />
                        <Text style={styles.receiptActionText}>Receipt</Text>
                    </View>
                </View>
            </View>
        </Card>
    </TouchableOpacity>
));

// ─── Main Screen ─────────────────────────────────────────────────────────────
const StudentDetailsScreen = ({ route, navigation }: any) => {
    const { studentId } = route.params || {};
    const { theme } = useTheme();

    // Core student data (loaded immediately)
    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);

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

    // Date picker visibility
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [isDueDatePickerVisible, setDueDatePickerVisibility] = useState(false);

    // Guard against concurrent fetches
    const isFetching = useRef(false);

    // ── Fetch core student info only (fast) ───────────────────────────────
    const fetchStudentDetails = useCallback(async () => {
        if (!studentId) {
            Alert.alert('Error', 'No student ID provided');
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
                setStudent(coreData);

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
                Alert.alert('Not Found', 'Student details not found.');
                navigation.goBack();
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to fetch student details' });
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

    // ── Date picker handlers ───────────────────────────────────────────────
    const handleConfirmDate = useCallback((date: Date) => {
        setPayDate(date.toISOString().split('T')[0]);
        setDatePickerVisibility(false);
    }, []);

    const handleConfirmDueDate = useCallback((date: Date) => {
        setPayDueDate(date.toISOString().split('T')[0]);
        setDueDatePickerVisibility(false);
    }, []);

    // Calculate total outstanding balance from pending dues
    const outstandingBalance = useMemo(() => {
        if (!student?.pending_dues?.length) return 0;
        return student.pending_dues.reduce((sum: number, due: any) => sum + (parseFloat(due.balance) || 0), 0);
    }, [student]);

    // ── Open payment modal ─────────────────────────────────────────────────
    const openPayModal = useCallback(() => {
        const monthlyRent = parseFloat(student?.monthly_rent || '0');
        // Default amount is the total outstanding balance, or just monthly rent if no dues (e.g. advance)
        const defaultAmount = outstandingBalance > 0 ? outstandingBalance : monthlyRent;

        setPayAmount(defaultAmount.toString());

        const nextMonth = new Date();
        if (outstandingBalance <= 0) nextMonth.setMonth(nextMonth.getMonth() + 1);
        setPayDueDate(nextMonth.toISOString().split('T')[0]);

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
        } else {
            nextStatus = 1;
            title = 'Mark as Active?';
            message = 'This tenant will be marked as active again.';
            confirmText = 'Yes, mark Active';
        }

        Alert.alert(
            title,
            message,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: confirmText,
                    style: isDestructive ? 'destructive' : 'default',
                    onPress: async () => {
                        try {
                            setStatusLoading(true);
                            const res = await api.put(`/students/${student.student_id}`, {
                                status: nextStatus
                            });
                            if (res.data.success) {
                                setStudent((prev: any) => ({ ...prev, status: nextStatus }));
                                Toast.show({
                                    type: 'success',
                                    text1: currentStatus === 2 ? 'Checked In Successfully!' : `Marked as ${nextStatus === 1 ? 'Active' : 'Inactive'}`,
                                    text2: `${student.first_name} is now ${nextStatus === 1 ? 'active' : 'inactive'}.`
                                });
                                fetchStudentDetails(); // refresh details to sync billing fee histories
                            }
                        } catch (e: any) {
                            Alert.alert('Error', e.response?.data?.error || 'Failed to update status');
                        } finally {
                            setStatusLoading(false);
                        }
                    }
                }
            ]
        );
    }, [student, fetchStudentDetails]);

    // ── Schedule Vacancy Notice ───────────────────────────────────────────
    const handleSetVacancyNotice = useCallback(async () => {
        if (!noticeDate) {
            Alert.alert('Invalid Date', 'Please select a vacating date.');
            return;
        }
        try {
            setNoticeSubmitLoading(true);
            const res = await api.put(`/students/${studentId}`, {
                vacate_notice_date: noticeDate,
                vacate_notice_reason: noticeReason || null
            });
            if (res.data.success) {
                Toast.show({ type: 'success', text1: 'Vacancy Notice Scheduled', text2: `Tenant vacating on ${noticeDate}` });
                setNoticeModalVisible(false);
                fetchStudentDetails();
            }
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.error || 'Failed to set vacancy notice');
        } finally {
            setNoticeSubmitLoading(false);
        }
    }, [studentId, noticeDate, noticeReason, fetchStudentDetails]);

    // ── Clear Vacancy Notice ──────────────────────────────────────────────
    const handleClearVacancyNotice = useCallback(async () => {
        Alert.alert(
            'Cancel Vacancy Notice?',
            'Are you sure you want to clear the scheduled vacate date?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Yes, Clear Notice',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const res = await api.put(`/students/${studentId}`, {
                                vacate_notice_date: null,
                                vacate_notice_reason: null
                            });
                            if (res.data.success) {
                                Toast.show({ type: 'success', text1: 'Vacancy Notice Cancelled' });
                                fetchStudentDetails();
                            }
                        } catch (e: any) {
                            Alert.alert('Error', e.response?.data?.error || 'Failed to clear vacancy notice');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    }, [studentId, fetchStudentDetails]);

    // ── Submit payment ─────────────────────────────────────────────────────
    const handleRecordPayment = useCallback(async () => {
        if (!payAmount || isNaN(parseFloat(payAmount))) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount.');
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
                Toast.show({ type: 'success', text1: 'Success', text2: 'Payment recorded successfully!' });
                setPayModalVisible(false);
                setPayAmount('');
                setPayNotes('');
                setPayTransactionId('');
                setPayReceiptNumber('');

                // Refresh student data silently in background
                fetchStudentDetails();
            }
        } catch (error: any) {
            console.error('Payment error:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to record payment');
        } finally {
            setPayLoading(false);
        }
    }, [payAmount, payDate, payDueDate, payModeId, payTransactionId, payReceiptNumber,
        payNotes, payReason, student, fetchStudentDetails]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <AppHeader 
                title="Student Details" 
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

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                overScrollMode="never"
            >
                {loading || !student ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={{ marginTop: 10, color: '#64748B' }}>Loading student details...</Text>
                    </View>
                ) : (
                    <>
                        {/* ── Profile Card ─────────────────────────────────────── */}
                        <Card style={styles.profileCard}>
                            <View style={styles.profileSection}>
                                {student.photo ? (
                                    <Image
                                        source={{ uri: student.photo }}
                                        style={styles.avatar}
                                        fadeDuration={0}
                                    />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <User size={40} color="#94A3B8" />
                                    </View>
                                )}
                                <View style={styles.profileInfo}>
                                    <Text style={styles.name}>{student.first_name} {student.last_name}</Text>
                                    <Text style={styles.roomInfo}>Room {student.room_number || 'Not Assigned'}</Text>
                                    <View style={styles.badgeRow}>
                                        <Badge
                                            label={outstandingBalance > 0 ? 'Payment Pending' : 'Paid'}
                                            variant={outstandingBalance > 0 ? 'error' : 'success'}
                                            style={styles.badge}
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* ── Active / Inactive / Pre-booked Toggle ── */}
                            <View style={styles.statusToggleRow}>
                                <View style={styles.statusToggleLeft}>
                                    <View style={[
                                        styles.statusIndicator, 
                                        { backgroundColor: student.status === 1 ? '#DCFCE7' : student.status === 2 ? '#FEF3C7' : '#FEE2E2' }
                                    ]}>
                                        <Text style={[
                                            styles.statusIndicatorText, 
                                            { color: student.status === 1 ? '#16A34A' : student.status === 2 ? '#D97706' : '#DC2626' }
                                        ]}>
                                            {student.status === 1 ? '● Active' : student.status === 2 ? '● Pre-Booked' : '● Inactive'}
                                        </Text>
                                    </View>
                                    <Text style={styles.statusToggleHint}>Tap to change status</Text>
                                </View>
                                {statusLoading ? (
                                    <ActivityIndicator size="small" color="#FF6B6B" />
                                ) : (
                                    <TouchableOpacity
                                        style={[
                                            styles.statusToggleBtn, 
                                            { backgroundColor: student.status === 2 ? '#DCFCE7' : student.status === 1 ? '#FEE2E2' : '#DCFCE7' }
                                        ]}
                                        onPress={handleToggleStatus}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[
                                            styles.statusToggleBtnText, 
                                            { color: student.status === 2 ? '#16A34A' : student.status === 1 ? '#DC2626' : '#16A34A' }
                                        ]}>
                                            {student.status === 2 ? 'Check In (Activate)' : student.status === 1 ? 'Mark Inactive' : 'Mark Active'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* ── Vacancy Notice Action Row (Only for Active residents) ── */}
                            {student.status === 1 && (
                                <View style={[styles.statusToggleRow, { marginTop: 12, paddingTop: 12 }]}>
                                    <View style={styles.statusToggleLeft}>
                                        <Text style={styles.noticeRowTitle}>📅 Vacancy Notice</Text>
                                        <Text style={styles.statusToggleHint}>
                                            {student.vacate_notice_date ? 'Modify scheduled notice' : 'Schedule tenant checkout'}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.statusToggleBtn, { backgroundColor: '#FEF3C7' }]}
                                        onPress={() => {
                                            setNoticeDate(student.vacate_notice_date ? student.vacate_notice_date.split('T')[0] : new Date().toISOString().split('T')[0]);
                                            setNoticeReason(student.vacate_notice_reason || '');
                                            setNoticeModalVisible(true);
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.statusToggleBtnText, { color: '#D97706' }]}>
                                            {student.vacate_notice_date ? 'Modify Notice' : 'Schedule Vacate'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </Card>

                        {/* ── Vacancy Notice Banner ── */}
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

                        {/* ── Balance & Quick Pay ───────────────────────────────── */}
                        <Card style={styles.rentCard}>
                            <View style={styles.rentHeader}>
                                <View>
                                    <Text style={styles.rentLabel}>Total Outstanding Balance</Text>
                                    <Text style={[styles.rentValue, { color: outstandingBalance > 0 ? '#EF4444' : '#10B981' }]}>
                                        ₹{outstandingBalance}
                                    </Text>
                                </View>
                                {outstandingBalance > 0 && (
                                    <TouchableOpacity style={styles.payButton} onPress={openPayModal}>
                                        <Text style={styles.payButtonText}>Pay Now</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </Card>

                        {/* ── Contact Information ───────────────────────────────── */}
                        <Text style={styles.sectionTitle}>Contact Information</Text>
                        <Card style={styles.infoCard}>
                            <DetailItem
                                icon={<Phone size={20} color="#FF6B6B" />}
                                label="Phone Number"
                                value={student.phone}
                                onPress={() => Linking.openURL(`tel:${student.phone}`)}
                            />
                            <View style={styles.divider} />
                            <DetailItem
                                icon={<Mail size={20} color="#FF6B6B" />}
                                label="Email Address"
                                value={student.email}
                                onPress={student.email ? () => Linking.openURL(`mailto:${student.email}`) : undefined}
                            />
                            <View style={styles.divider} />
                            <DetailItem
                                icon={<MapPin size={20} color="#FF6B6B" />}
                                label="Address"
                                value={student.permanent_address}
                            />
                        </Card>

                        {/* ── Guardian Information ───────────────────────────────── */}
                        <Text style={styles.sectionTitle}>Guardian Information</Text>
                        <Card style={styles.infoCard}>
                            <DetailItem
                                icon={<User size={20} color="#FF6B6B" />}
                                label="Guardian Name"
                                value={student.guardian_name}
                            />
                            <View style={styles.divider} />
                            <DetailItem
                                icon={<Phone size={20} color="#FF6B6B" />}
                                label="Guardian Phone"
                                value={student.guardian_phone}
                                onPress={student.guardian_phone ? () => Linking.openURL(`tel:${student.guardian_phone}`) : undefined}
                            />
                            <View style={styles.divider} />
                            <DetailItem
                                icon={<Users size={20} color="#FF6B6B" />}
                                label="Relation"
                                value={student.guardian_relation_name || student.guardian_relation}
                            />
                        </Card>

                        {/* ── Personal & Identity ────────────────────────────────── */}
                        <Text style={styles.sectionTitle}>Personal & Identity</Text>
                        <Card style={styles.infoCard}>
                            <DetailItem
                                icon={<User size={20} color="#4A90E2" />}
                                label="Gender"
                                value={student.gender}
                            />
                            <View style={styles.divider} />
                            <DetailItem
                                icon={<Calendar size={20} color="#4A90E2" />}
                                label="Date of Birth"
                                value={student.date_of_birth
                                    ? new Date(student.date_of_birth).toLocaleDateString()
                                    : 'N/A'}
                            />
                            <View style={styles.divider} />
                            <DetailItem
                                icon={<CreditCard size={20} color="#4A90E2" />}
                                label="ID Proof"
                                value={`${student.id_proof_type_name || 'ID'} : ${student.id_proof_number || 'N/A'}`}
                            />
                        </Card>

                        {/* ── Registration Details ──────────────────────────────── */}
                        <Text style={styles.sectionTitle}>Registration Details</Text>
                        <Card style={styles.infoCard}>
                            <DetailItem
                                icon={<Calendar size={20} color="#10B981" />}
                                label="Admission Date"
                                value={student.admission_date
                                    ? new Date(student.admission_date).toLocaleDateString()
                                    : 'N/A'}
                            />
                            <View style={styles.divider} />
                            <DetailItem
                                icon={<CreditCard size={20} color="#10B981" />}
                                label="Monthly Rent"
                                value={`₹${student.monthly_rent || 0}`}
                            />
                            <View style={styles.divider} />
                            <DetailItem
                                icon={<IndianRupee size={20} color="#10B981" />}
                                label="Admission Fee"
                                value={`₹${student.admission_fee || 0} (${student.admission_status === 1 ? 'Paid' : 'Unpaid'})`}
                            />
                        </Card>

                        {/* ── Payment History (deferred render) ────────────────── */}
                        <Text style={styles.sectionTitle}>Payment History</Text>
                        {historyLoading ? (
                            <ActivityIndicator size="small" color="#94A3B8" style={{ marginVertical: 20 }} />
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
            </ScrollView>

            {/* ── Payment Modal ─────────────────────────────────────────── */}
            <Modal
                visible={payModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setPayModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Record Payment</Text>
                            <TouchableOpacity onPress={() => setPayModalVisible(false)}>
                                <X size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            <Text style={styles.inputLabel}>Amount to Pay (₹) *</Text>
                            <TextInput
                                style={styles.amountInput}
                                value={payAmount}
                                onChangeText={setPayAmount}
                                keyboardType="numeric"
                                placeholder="0.00"
                            />

                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={styles.inputLabel}>Payment Date *</Text>
                                    <TouchableOpacity
                                        style={styles.dateSelector}
                                        onPress={() => setDatePickerVisibility(true)}
                                    >
                                        <Calendar size={18} color="#FF6B6B" />
                                        <Text style={styles.dateText}>{payDate}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <Text style={styles.inputLabel}>Due Date *</Text>
                                    <TouchableOpacity
                                        style={styles.dateSelector}
                                        onPress={() => setDueDatePickerVisibility(true)}
                                    >
                                        <Calendar size={18} color="#FF6B6B" />
                                        <Text style={styles.dateText}>{payDueDate}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <DateTimePickerModal
                                isVisible={isDatePickerVisible}
                                mode="date"
                                onConfirm={handleConfirmDate}
                                onCancel={() => setDatePickerVisibility(false)}
                                date={new Date(payDate)}
                            />
                            <DateTimePickerModal
                                isVisible={isDueDatePickerVisible}
                                mode="date"
                                onConfirm={handleConfirmDueDate}
                                onCancel={() => setDueDatePickerVisibility(false)}
                                date={new Date(payDueDate)}
                            />

                            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Payment Mode *</Text>
                            <View style={styles.verticalModeContainer}>
                                {paymentModes.map((mode) => {
                                    const mId = mode.payment_mode_id || mode.id;
                                    const mName = mode.payment_mode_name || mode.name || 'Unknown';
                                    const isSelected = payModeId === mId.toString();
                                    return (
                                        <TouchableOpacity
                                            key={mId}
                                            style={[styles.modeListItem, isSelected && styles.modeListItemActive]}
                                            onPress={() => setPayModeId(mId.toString())}
                                        >
                                            <Text style={[
                                                styles.modeListItemText,
                                                isSelected && styles.modeListItemTextActive
                                            ]}>
                                                {mName}
                                            </Text>
                                            {isSelected && <CheckCircle color="#FF6B6B" size={18} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Transaction ID (Optional)</Text>
                            <TextInput
                                style={styles.amountInput}
                                value={payTransactionId}
                                onChangeText={setPayTransactionId}
                                placeholder="TXN123456"
                            />

                            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Receipt Number (Optional)</Text>
                            <TextInput
                                style={styles.amountInput}
                                value={payReceiptNumber}
                                onChangeText={setPayReceiptNumber}
                                placeholder="REC-789"
                            />

                            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Reason (Optional)</Text>
                            <TextInput
                                style={styles.amountInput}
                                value={payReason}
                                onChangeText={setPayReason}
                                placeholder="e.g. Monthly Fee, Security Deposit"
                            />

                            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Notes</Text>
                            <TextInput
                                style={[styles.notesInput, { height: 80 }]}
                                value={payNotes}
                                onChangeText={setPayNotes}
                                multiline={true}
                                placeholder="Add optional notes..."
                                textAlignVertical="top"
                            />

                            <TouchableOpacity
                                style={[styles.submitButton, payLoading && styles.disabledButton]}
                                onPress={handleRecordPayment}
                                disabled={payLoading}
                            >
                                {payLoading
                                    ? <ActivityIndicator color="#FFF" />
                                    : <Text style={styles.submitButtonText}>Submit Payment</Text>
                                }
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ── Vacancy Notice Modal ─────────────────────────────────────── */}
            <Modal
                visible={noticeModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setNoticeModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Schedule Vacate Date</Text>
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
                                <Calendar size={18} color="#FF6B6B" />
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
                </View>
            </Modal>

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
    scrollContent: { padding: 20, paddingBottom: 100 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
    profileCard: { marginBottom: 24, padding: 20, paddingBottom: 16 },
    statusToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    statusToggleLeft: { flex: 1 },
    statusIndicator: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 4 },
    statusIndicatorText: { fontSize: 13, fontWeight: '700' },
    statusToggleHint: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
    statusToggleBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
    statusToggleBtnText: { fontSize: 13, fontWeight: '700' },
    profileSection: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 80, height: 80, borderRadius: 40, marginRight: 16 },
    avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 2, borderColor: '#E2E8F0' },
    profileInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    name: { fontSize: 22, fontWeight: '700', color: '#1E293B', marginRight: 8 },
    statusDot: { width: 12, height: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
    activeDot: { backgroundColor: '#10B981' },
    inactiveDot: { backgroundColor: '#EF4444' },
    roomInfo: { fontSize: 15, color: '#64748B', marginBottom: 8, fontWeight: '500' },
    badge: { marginTop: 4, alignSelf: 'flex-start' },
    badgeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 12, marginTop: 8 },
    infoCard: { marginBottom: 20, padding: 0 },
    detailItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF1F1', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    detailText: { flex: 1 },
    detailLabel: { fontSize: 12, color: '#94A3B8', marginBottom: 2, fontWeight: '500' },
    detailValue: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 68 },
    historyCard: { marginBottom: 12, padding: 12 },
    historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    historyIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
    historyTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
    historyDate: { fontSize: 12, color: '#94A3B8' },
    historyMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#CBD5E1', marginHorizontal: 6 },
    historyRight: { alignItems: 'flex-end' },
    historyAmount: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    receiptAction: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    receiptActionText: { fontSize: 10, fontWeight: '700', color: '#EF4444' },
    historySubText: { fontSize: 11, color: '#64748B' },
    historyNotes: { fontSize: 11, color: '#94A3B8', marginTop: 4, fontStyle: 'italic' },
    emptyHistoryCard: { padding: 30, alignItems: 'center', justifyContent: 'center', gap: 8 },
    emptyHistoryText: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },
    rentCard: { marginBottom: 20, backgroundColor: '#FFFFFF', padding: 16 },
    rentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rentLabel: { fontSize: 14, color: '#64748B', marginBottom: 4 },
    rentValue: { fontSize: 24, fontWeight: '800', color: '#1E293B' },
    payButton: { backgroundColor: '#FF6B6B', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
    payButtonText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
    modalBody: { gap: 8 },
    inputLabel: { fontSize: 14, fontWeight: '600', color: '#64748B' },
    amountInput: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 16, fontSize: 18, fontWeight: '600', color: '#1E293B' },
    notesInput: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 16, fontSize: 16, color: '#1E293B' },
    submitButton: { backgroundColor: '#FF6B6B', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 16 },
    disabledButton: { backgroundColor: '#FF6B6B80' },
    submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    row: { flexDirection: 'row', marginTop: 12 },
    dateSelector: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F1F5F9', padding: 12, borderRadius: 10, marginTop: 6 },
    dateText: { fontSize: 14, color: '#1E293B', fontWeight: '600' },
    verticalModeContainer: { flexDirection: 'column', gap: 8, marginTop: 8 },
    modeListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    modeListItemActive: { backgroundColor: '#FFF1F1', borderColor: '#FF6B6B' },
    modeListItemText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
    modeListItemTextActive: { color: '#FF6B6B', fontWeight: '700' },
    noticeCard: { marginBottom: 20, backgroundColor: '#FFFBEB', borderColor: '#FEF3C7', borderWidth: 1, padding: 16 },
    noticeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    noticeInfo: { flex: 1, marginRight: 10 },
    noticeTitle: { fontSize: 15, fontWeight: '700', color: '#D97706', marginBottom: 4 },
    noticeText: { fontSize: 13, color: '#B45309', fontWeight: '500' },
    noticeReason: { fontSize: 12, color: '#B45309', marginTop: 4, fontStyle: 'italic' },
    noticeCancelBtn: { backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B' },
    noticeCancelText: { color: '#D97706', fontWeight: '700', fontSize: 12 },
    noticeRowTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
});

export default StudentDetailsScreen;