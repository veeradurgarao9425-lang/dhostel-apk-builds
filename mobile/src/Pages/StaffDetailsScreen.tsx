import React, { useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Linking, ActivityIndicator, Animated, Image, StatusBar, Modal
} from 'react-native';
import { Card } from '../components/Card';
import {
    Phone, Mail, Calendar, CreditCard,
    User, IndianRupee, Clock, Check, X,
    Receipt, Edit, Briefcase, Plus, MessageCircle, MessageSquare, ArrowRight, Eye,
    KeyRound, Shield
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { FullScreenLoader } from '../components/FullScreenLoader';
import { useTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { useFocusEffect } from '@react-navigation/native';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { StaffPaymentDrawer } from '../components/StaffPaymentDrawer';
import { getResolvedImageUrl } from '../utils/imageHelper';

const todayStr = () => new Date().toISOString().split('T')[0];

const PaymentHistoryItem = React.memo(({ payment, onPress }: { payment: any; onPress: (p: any) => void }) => {
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
                            <Text style={[styles.historyTitle, { color: theme.textPrimary }]}>{payment.note || 'Wage Payment'}</Text>
                            <Text style={[styles.historyDate, { color: theme.textSecondary }]}>
                                {new Date(payment.payment_date).toLocaleDateString()}
                            </Text>
                            <View style={styles.historyMetaRow}>
                                <Text style={[styles.historySubText, { color: theme.textSecondary }]}>
                                    {payment.days_worked ? `${payment.days_worked} days` : payment.mode}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.historyRight}>
                        <Text style={[styles.historyAmount, { color: theme.textPrimary }]}>₹{payment.amount}</Text>
                        <TouchableOpacity 
                            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primary + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 6 }}
                            onPress={() => onPress(payment)}
                        >
                            <Receipt size={12} color={theme.primary} />
                            <Text style={{ fontSize: 10, color: theme.primary, fontWeight: '700', marginLeft: 4 }}>Receipt</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Card>
        </TouchableOpacity>
    );
});

export default function StaffDetailsScreen({ route, navigation }: any) {
    const { staffId } = route.params || {};
    const { theme, isDark } = useTheme();
    const { showError, showSuccess, showApiError } = useToast();
    const confirm = useConfirmation();

    const [staff, setStaff] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [statusLoading, setStatusLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'payments'>('info');

    const tabAnim = useRef(new Animated.Value(0)).current;

    const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [avatarError, setAvatarError] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

    // Payment Drawer State
    const [modalVisible, setModalVisible] = useState(false);
    const [payAmount, setPayAmount] = useState('');
    const [payDays, setPayDays] = useState('');
    const [payNote, setPayNote] = useState('');
    const [payDate, setPayDate] = useState(todayStr());
    const [payMode, setPayMode] = useState('Cash');
    const [payTransactionId, setPayTransactionId] = useState('');
    const [payReceiptNumber, setPayReceiptNumber] = useState('');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const switchTab = useCallback((tab: 'info' | 'payments') => {
        setActiveTab(tab);
        Animated.spring(tabAnim, {
            toValue: tab === 'info' ? 0 : 1,
            useNativeDriver: false,
            tension: 120,
            friction: 10,
        }).start();
    }, [tabAnim]);

    const getInitials = (name: string) => {
        if (!name) return 'S';
        const parts = name.split(' ');
        if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name[0].toUpperCase();
    };

    const fetchStaffDetails = useCallback(async () => {
        if (!staffId) return;
        try {
            setLoading(true);
            const res = await api.get(`/staff/${staffId}`);
            if (res.data.success) {
                setStaff(res.data.data);
            } else {
                showError('Staff member not found');
                navigation.goBack();
            }
        } catch (e: any) {
            showApiError(e, 'Failed to fetch details');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    }, [staffId, navigation]);

    const fetchPayments = useCallback(async () => {
        if (!staffId) return;
        try {
            setHistoryLoading(true);
            const res = await api.get(`/staff/${staffId}/payments`);
            if (res.data.success) {
                setPaymentHistory(res.data.data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setHistoryLoading(false);
        }
    }, [staffId]);

    useFocusEffect(
        useCallback(() => {
            fetchStaffDetails();
            fetchPayments();
        }, [fetchStaffDetails, fetchPayments])
    );

    const handleToggleStatus = async () => {
        if (!staff) return;
        const newStatus = staff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        
        confirm({
            title: `Make Staff ${newStatus}?`,
            message: `Are you sure you want to mark ${staff.full_name} as ${newStatus}?`,
            confirmText: 'Yes, Change Status',
            cancelText: 'Cancel',
            variant: newStatus === 'INACTIVE' ? 'danger' : 'info',
            onConfirm: async () => {
                setStatusLoading(true);
                try {
                    const res = await api.put(`/staff/${staffId}`, { status: newStatus });
                    if (res.data.success) {
                        showSuccess(`Staff marked as ${newStatus}`);
                        setStaff({ ...staff, status: newStatus });
                    }
                } catch (e: any) {
                    showApiError(e, 'Failed to update status');
                } finally {
                    setStatusLoading(false);
                }
            }
        });
    };

    const validatePayment = () => {
        const errs: Record<string, string> = {};
        if (!payAmount || isNaN(Number(payAmount)) || Number(payAmount) <= 0) {
            errs.amount = 'Valid amount is required';
        }
        if (!payDate) {
            errs.date = 'Date is required';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSavePayment = async () => {
        if (!validatePayment()) {
            showError('Please fix the highlighted fields');
            return;
        }
        setSaving(true);
        try {
            const res = await api.post(`/staff/${staffId}/payments`, {
                amount: parseFloat(payAmount),
                payment_date: payDate,
                days_worked: payDays ? parseInt(payDays) : null,
                note: payNote.trim() || null,
                mode: payMode,
                transaction_id: payTransactionId || null,
                receipt_number: payReceiptNumber || null
            });
            if (res.data?.success) {
                showSuccess('Payment saved successfully!');
                setModalVisible(false);
                setPayAmount(''); setPayDays(''); setPayNote(''); setPayDate(todayStr());
                setPayTransactionId(''); setPayReceiptNumber(''); setErrors({});
                fetchPayments();
            }
        } catch (error: any) {
            showApiError(error, 'Failed to record payment');
        } finally {
            setSaving(false);
        }
    };

    const openPaymentDrawer = () => {
        setPayAmount('');
        setPayDays('');
        setPayNote('');
        setPayDate(todayStr());
        setPayMode('Cash');
        setPayTransactionId('');
        setPayReceiptNumber('');
        setErrors({});
        setModalVisible(true);
    };

    const handleDeletePayment = (p: any) => {
        confirm({
            title: 'Delete Payment',
            message: `Remove this ₹${Number(p.amount).toLocaleString('en-IN')} payment?`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await api.delete(`/staff/payments/${p.payment_id}`);
                    fetchPayments();
                    showSuccess('Payment deleted successfully');
                } catch {
                    showError('Failed to delete payment.');
                }
            }
        });
    };

    if (loading || !staff) {
        return (
            <View style={[styles.root, { backgroundColor: theme.background }]}>
                <AppHeader title="Staff Details" showBack />
                <FullScreenLoader visible={true} />
            </View>
        );
    }

    const isActive = staff.status === 'ACTIVE';

    return (
        <View style={[styles.root, { backgroundColor: theme.background }]}>
            <AppHeader
                title="Staff Details"
                showBack
                rightComponent={
                    <TouchableOpacity onPress={() => navigation.navigate('AddStaff', { staffId: staff.staff_id, isEdit: true })}>
                        <Edit size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                }
            />
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                <View style={{ padding: 16 }}>
                    {/* ── Profile Hero Header ─────────────────────────────────────── */}
                    <Card style={[styles.profileCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                        <View style={styles.profileSection}>
                            <View style={styles.avatarWrapper}>
                                {staff.photo && getResolvedImageUrl(staff.photo) && !avatarError ? (
                                    <Image 
                                        source={{ uri: getResolvedImageUrl(staff.photo)! }} 
                                        style={styles.avatar} 
                                        onError={() => setAvatarError(true)}
                                    />
                                ) : (
                                    <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}>
                                        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.primary }}>
                                            {getInitials(staff.full_name)}
                                        </Text>
                                    </View>
                                )}
                                <View style={[styles.avatarStatusBadge, { backgroundColor: isActive ? theme.success : theme.error }]} />
                            </View>
                            
                            <View style={styles.profileInfo}>
                                <View style={styles.nameRow}>
                                    <Text style={[styles.name, { color: theme.textPrimary }]} numberOfLines={1}>
                                        {staff.full_name}
                                    </Text>
                                    <View style={[styles.activeStatusPill, { backgroundColor: isActive ? '#E6F9F3' : '#FFEBEE' }]}>
                                        <Text style={[styles.activeStatusPillText, { color: isActive ? '#00B074' : '#E53935' }]}>
                                            {isActive ? 'Active' : 'Inactive'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[styles.roleInfo, { color: theme.textSecondary }]}>
                                    Role: {staff.role || 'Staff Member'}
                                </Text>
                                <View style={styles.cardBadgesRow}>
                                    <View style={[styles.cardBadge, { backgroundColor: '#EDE9FF' }]}>
                                        <Calendar size={10} color="#5F2EEA" />
                                        <Text style={[styles.cardBadgeText, { color: '#5F2EEA' }]}>
                                            Since {staff.join_date ? new Date(staff.join_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View style={styles.profileDivider} />

                        {/* ── Quick Action Row ── */}
                        <View style={styles.quickActionsRow}>
                            {/* CALL */}
                            <TouchableOpacity 
                                style={styles.quickActionItem} 
                                onPress={() => staff.phone && Linking.openURL(`tel:${staff.phone}`)}
                                disabled={!staff.phone}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.quickActionCircle, { backgroundColor: '#E3F2FD' }]}>
                                    <Phone size={16} color="#2196F3" />
                                </View>
                                <Text style={[styles.quickActionLabel, { color: theme.textPrimary }]}>Call</Text>
                            </TouchableOpacity>

                            {/* WHATSAPP */}
                            <TouchableOpacity 
                                style={styles.quickActionItem} 
                                onPress={() => staff.phone && Linking.openURL(`https://wa.me/91${staff.phone}`)}
                                disabled={!staff.phone}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.quickActionCircle, { backgroundColor: '#E8F8F0' }]}>
                                    <MessageCircle size={16} color="#25D366" />
                                </View>
                                <Text style={[styles.quickActionLabel, { color: theme.textPrimary }]}>WhatsApp</Text>
                            </TouchableOpacity>

                            {/* MESSAGE */}
                            <TouchableOpacity 
                                style={styles.quickActionItem} 
                                onPress={() => staff.phone && Linking.openURL(`sms:${staff.phone}`)}
                                disabled={!staff.phone}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.quickActionCircle, { backgroundColor: '#EDE9FF' }]}>
                                    <MessageSquare size={16} color="#5F2EEA" />
                                </View>
                                <Text style={[styles.quickActionLabel, { color: theme.textPrimary }]}>Message</Text>
                            </TouchableOpacity>
                        </View>
                    </Card>

                    {/* ── Active / Inactive Status Card ── */}
                    <Card style={[styles.actionCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                        <View style={styles.actionCardRow}>
                            <View style={[styles.actionCardIconCircle, { backgroundColor: isActive ? '#E6F9F3' : '#FFEBEE' }]}>
                                <View style={[styles.actionStatusInnerDot, { backgroundColor: isActive ? '#00B074' : '#E53935' }]} />
                            </View>
                            <View style={styles.actionCardContent}>
                                <Text style={[styles.actionCardTitle, { color: theme.textPrimary }]}>
                                    {isActive ? 'Active Staff' : 'Inactive Staff'}
                                </Text>
                                <Text style={[styles.actionCardSubtitle, { color: theme.textSecondary }]}>
                                    {isActive ? 'Staff member is currently active' : 'Staff member is currently inactive'}
                                </Text>
                            </View>
                            {statusLoading ? (
                                <ActivityIndicator size="small" color={theme.primary} />
                            ) : (
                                <TouchableOpacity
                                    style={[
                                        styles.actionCardButton,
                                        {
                                            backgroundColor: isActive ? '#FFEBEE' : '#E6F9F3',
                                            borderColor: isActive ? '#FFEBEE' : '#E6F9F3',
                                        }
                                    ]}
                                    onPress={handleToggleStatus}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[
                                        styles.actionCardButtonText,
                                        { color: isActive ? '#E53935' : '#00B074' }
                                    ]}>
                                        {isActive ? 'Deactivate' : 'Activate'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </Card>

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
                            <User size={16} color={activeTab === 'info' ? theme.primary : theme.textSecondary} />
                            <Text style={[
                                styles.tabText,
                                { color: activeTab === 'info' ? theme.textPrimary : theme.textSecondary }
                            ]}>
                                Details
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.tabButton}
                            onPress={() => switchTab('payments')}
                            activeOpacity={0.8}
                        >
                            <Receipt size={16} color={activeTab === 'payments' ? theme.primary : theme.textSecondary} />
                            <Text style={[
                                styles.tabText,
                                { color: activeTab === 'payments' ? theme.textPrimary : theme.textSecondary }
                            ]}>
                                Payments
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Tab Content */}
                    <View style={styles.contentArea}>
                        {activeTab === 'info' ? (
                            <Animated.View style={{ opacity: tabAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
                                
                                {/* Contact Info */}
                                <View style={[styles.infoSectionCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                    <View style={styles.infoSectionHeader}>
                                        <Phone size={14} color={theme.primary} />
                                        <Text style={[styles.infoSectionHeaderTitle, { color: theme.primary }]}>Contact Info</Text>
                                    </View>
                                    <View style={styles.infoSectionBody}>
                                        <View style={styles.infoRow}>
                                            <View style={[styles.infoRowIconCircle, { backgroundColor: '#E3F2FD' }]}>
                                                <Phone size={13} color="#2196F3" />
                                            </View>
                                            <View style={styles.infoRowText}>
                                                <Text style={styles.infoRowLabel}>Phone Number</Text>
                                                <Text style={[styles.infoRowValue, { color: theme.textPrimary }]}>{staff.phone || 'N/A'}</Text>
                                            </View>
                                        </View>
                                        
                                        {staff.email ? (
                                            <>
                                                <View style={styles.infoRowDivider} />
                                                <View style={styles.infoRow}>
                                                    <View style={[styles.infoRowIconCircle, { backgroundColor: '#EDE9FF' }]}>
                                                        <Mail size={13} color="#5F2EEA" />
                                                    </View>
                                                    <View style={styles.infoRowText}>
                                                        <Text style={styles.infoRowLabel}>Email Address</Text>
                                                        <Text style={[styles.infoRowValue, { color: theme.textPrimary }]}>{staff.email}</Text>
                                                    </View>
                                                </View>
                                            </>
                                        ) : null}
                                    </View>
                                </View>

                                {/* Employment Details */}
                                <View style={[styles.infoSectionCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                    <View style={styles.infoSectionHeader}>
                                        <Briefcase size={14} color={theme.primary} />
                                        <Text style={[styles.infoSectionHeaderTitle, { color: theme.primary }]}>Employment Details</Text>
                                    </View>
                                    <View style={styles.infoSectionBody}>
                                        <View style={styles.infoRow}>
                                            <View style={[styles.infoRowIconCircle, { backgroundColor: '#FFF3E0' }]}>
                                                <Briefcase size={13} color="#FF9800" />
                                            </View>
                                            <View style={styles.infoRowText}>
                                                <Text style={styles.infoRowLabel}>Role</Text>
                                                <Text style={[styles.infoRowValue, { color: theme.textPrimary }]}>{staff.role || 'N/A'}</Text>
                                            </View>
                                        </View>
                                        
                                        <View style={styles.infoRowDivider} />
                                        <View style={styles.infoRow}>
                                            <View style={[styles.infoRowIconCircle, { backgroundColor: '#E8F5E9' }]}>
                                                <IndianRupee size={13} color="#4CAF50" />
                                            </View>
                                            <View style={styles.infoRowText}>
                                                <Text style={styles.infoRowLabel}>Monthly Salary</Text>
                                                <Text style={[styles.infoRowValue, { color: theme.textPrimary }]}>{staff.monthly_salary ? `₹${staff.monthly_salary}` : 'N/A'}</Text>
                                            </View>
                                        </View>
                                        
                                        <View style={styles.infoRowDivider} />
                                        <View style={styles.infoRow}>
                                            <View style={[styles.infoRowIconCircle, { backgroundColor: '#E1F5FE' }]}>
                                                <Calendar size={13} color="#03A9F4" />
                                            </View>
                                            <View style={styles.infoRowText}>
                                                <Text style={styles.infoRowLabel}>Join Date</Text>
                                                <Text style={[styles.infoRowValue, { color: theme.textPrimary }]}>
                                                    {staff.join_date ? new Date(staff.join_date).toLocaleDateString() : 'N/A'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                {/* App Login Access & Permissions Card */}
                                <View style={[styles.infoSectionCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                    <View style={[styles.infoSectionHeader, { justifyContent: 'space-between' }]}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <KeyRound size={14} color={theme.primary} />
                                            <Text style={[styles.infoSectionHeaderTitle, { color: theme.primary }]}>App Access & Bottom Tabs</Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => navigation.navigate('AddTeamMember', { staffId: staff.staff_id })}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 4,
                                                backgroundColor: theme.primary + '15',
                                                paddingHorizontal: 8,
                                                paddingVertical: 3,
                                                borderRadius: 6,
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Edit size={11} color={theme.primary} />
                                            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.primary }}>Edit Access</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.infoSectionBody}>
                                        <View style={styles.infoRow}>
                                            <View style={[styles.infoRowIconCircle, { backgroundColor: staff.can_login ? '#ECFDF5' : '#F1F5F9' }]}>
                                                {staff.can_login ? <Check size={13} color="#059669" /> : <X size={13} color="#94A3B8" />}
                                            </View>
                                            <View style={styles.infoRowText}>
                                                <Text style={styles.infoRowLabel}>Mobile App Login</Text>
                                                <Text style={[styles.infoRowValue, { color: staff.can_login ? '#059669' : '#64748B' }]}>
                                                    {staff.can_login ? 'Enabled (Active Access)' : 'Disabled'}
                                                </Text>
                                            </View>
                                        </View>

                                        {staff.can_login && (
                                            <>
                                                <View style={styles.infoRowDivider} />
                                                <Text style={[styles.infoRowLabel, { marginBottom: 6, marginTop: 2 }]}>Bottom Navigation Tabs Visible:</Text>
                                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                                    {(!staff.permissions || (typeof staff.permissions === 'object' && staff.permissions.dashboard !== 'none')) && (
                                                        <View style={styles.miniTabBadge}>
                                                            <Ionicons name="home" size={11} color="#4F46E5" />
                                                            <Text style={styles.miniTabBadgeText}>Home</Text>
                                                        </View>
                                                    )}
                                                    {staff.permissions && typeof staff.permissions === 'object' && staff.permissions.finance !== 'none' && (
                                                        <View style={[styles.miniTabBadge, { backgroundColor: '#ECFDF5', borderColor: '#BBF7D0' }]}>
                                                            <Ionicons name="cash" size={11} color="#16A34A" />
                                                            <Text style={[styles.miniTabBadgeText, { color: '#16A34A' }]}>Money</Text>
                                                        </View>
                                                    )}
                                                    {(!staff.permissions || (typeof staff.permissions === 'object' && staff.permissions.tenants !== 'none')) && (
                                                        <View style={styles.miniTabBadge}>
                                                            <Ionicons name="people" size={11} color="#4F46E5" />
                                                            <Text style={styles.miniTabBadgeText}>Students</Text>
                                                        </View>
                                                    )}
                                                    {staff.permissions && typeof staff.permissions === 'object' && staff.permissions.finance !== 'none' && (
                                                        <View style={[styles.miniTabBadge, { backgroundColor: '#ECFDF5', borderColor: '#BBF7D0' }]}>
                                                            <Ionicons name="trending-up" size={11} color="#16A34A" />
                                                            <Text style={[styles.miniTabBadgeText, { color: '#16A34A' }]}>Finance</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </>
                                        )}

                                        {/* Action Button to Open AddTeamMember Full Page Screen */}
                                        <TouchableOpacity
                                            onPress={() => navigation.navigate('AddTeamMember', { staffId: staff.staff_id })}
                                            style={[styles.configurePermsBtn, { backgroundColor: theme.primary }]}
                                            activeOpacity={0.85}
                                        >
                                            <Ionicons name="options-outline" size={15} color="#FFFFFF" />
                                            <Text style={styles.configurePermsBtnText}>Configure Feature Tabs & Access</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Identity Details */}
                                <View style={[styles.infoSectionCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                    <View style={styles.infoSectionHeader}>
                                        <CreditCard size={14} color={theme.primary} />
                                        <Text style={[styles.infoSectionHeaderTitle, { color: theme.primary }]}>Identity Details</Text>
                                    </View>
                                    <View style={styles.infoSectionBody}>
                                        <View style={styles.infoRow}>
                                            <View style={[styles.infoRowIconCircle, { backgroundColor: '#F3E5F5' }]}>
                                                <CreditCard size={13} color="#9C27B0" />
                                            </View>
                                            <View style={styles.infoRowText}>
                                                <Text style={styles.infoRowLabel}>ID Number</Text>
                                                <Text style={[styles.infoRowValue, { color: theme.textPrimary }]}>{staff.id_proof_number || staff.aadhaar_number || 'N/A'}</Text>
                                            </View>
                                        </View>

                                        {(staff.aadhaar_front || staff.aadhaar_back) && (
                                            <>
                                                <View style={styles.infoRowDivider} />
                                                <Text style={[styles.infoRowLabel, { marginBottom: 8, marginTop: 4 }]}>ID Proof Documents</Text>
                                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                                    {staff.aadhaar_front && (
                                                        <TouchableOpacity 
                                                            style={styles.docCard} 
                                                            onPress={() => setPreviewImageUrl(getResolvedImageUrl(staff.aadhaar_front))}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Image source={{ uri: getResolvedImageUrl(staff.aadhaar_front)! }} style={styles.docCardImg} />
                                                            <View style={styles.docCardOverlay}>
                                                                <Eye size={14} color="#FFF" />
                                                                <Text style={styles.docCardText}>Front View</Text>
                                                            </View>
                                                        </TouchableOpacity>
                                                    )}
                                                    {staff.aadhaar_back && (
                                                        <TouchableOpacity 
                                                            style={styles.docCard} 
                                                            onPress={() => setPreviewImageUrl(getResolvedImageUrl(staff.aadhaar_back))}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Image source={{ uri: getResolvedImageUrl(staff.aadhaar_back)! }} style={styles.docCardImg} />
                                                            <View style={styles.docCardOverlay}>
                                                                <Eye size={14} color="#FFF" />
                                                                <Text style={styles.docCardText}>Back View</Text>
                                                            </View>
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            </>
                                        )}
                                    </View>
                                </View>

                            </Animated.View>
                        ) : (
                            <Animated.View style={{ opacity: tabAnim }}>

                                {/* ── Quick Pay / Wallet Top-up Button ── */}
                                <TouchableOpacity
                                    style={[styles.payNowBtn, { backgroundColor: '#16A34A' }]}
                                    onPress={() => setModalVisible(true)}
                                    activeOpacity={0.85}
                                >
                                    <Plus size={18} color="#FFF" />
                                    <Text style={styles.payNowBtnText}>Pay Salary / Add Advance</Text>
                                </TouchableOpacity>

                                {/* Salary cycle quick summary */}
                                {staff.monthly_salary ? (
                                    <View style={styles.salarySummaryCard}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                            <IndianRupee size={16} color='#16A34A' />
                                            <Text style={[(styles as any).cardTitle, { color: theme.textPrimary, marginBottom: 0, marginLeft: 6 }]}>Advance Balance</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <View style={{ alignItems: 'center' }}>
                                                <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700' }}>MONTHLY</Text>
                                                <Text style={{ fontSize: 16, fontWeight: '900', color: '#1E293B', marginTop: 2 }}>₹{Number(staff.monthly_salary).toLocaleString('en-IN')}</Text>
                                            </View>
                                            <View style={{ width: 1, backgroundColor: '#F1F5F9' }} />
                                            <View style={{ alignItems: 'center' }}>
                                                <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700' }}>THIS MONTH</Text>
                                                <Text style={{ fontSize: 16, fontWeight: '900', color: '#F59E0B', marginTop: 2 }}>
                                                    ₹{paymentHistory
                                                        .filter((p: any) => {
                                                            const d = new Date(p.payment_date);
                                                            const now = new Date();
                                                            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                                                        })
                                                        .reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
                                                        .toLocaleString('en-IN')}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ) : null}

                                {/* Open full salary cycle screen */}
                                <TouchableOpacity
                                    style={[styles.viewCycleBtn, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}
                                    onPress={() => navigation.navigate('StaffPayments', { staffId: staff.staff_id, staffName: staff.full_name })}
                                >
                                    <IndianRupee size={16} color={theme.primary} />
                                    <Text style={[styles.viewCycleBtnText, { color: theme.primary }]}>Manage Advances & Salary Payments</Text>
                                    <ArrowRight size={16} color={theme.primary} />
                                </TouchableOpacity>

                                {/* Recent history preview */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 8 }}>
                                    <Text style={[(styles as any).cardTitle, { color: theme.textPrimary, marginBottom: 0 }]}>Recent Payments</Text>
                                    <TouchableOpacity
                                        style={[styles.addPayBtn, { backgroundColor: theme.primary }]}
                                        onPress={openPaymentDrawer}
                                        activeOpacity={0.8}
                                    >
                                        <Plus size={14} color="#FFF" />
                                        <Text style={styles.addPayText}>Record Wage</Text>
                                    </TouchableOpacity>
                                </View>

                                {historyLoading ? (
                                    <ActivityIndicator size="small" color={theme.primary} />
                                ) : paymentHistory.length === 0 ? (
                                    <View style={styles.emptyWrap}>
                                        <Receipt size={40} color={theme.textSecondary} style={{ opacity: 0.5, marginBottom: 10 }} />
                                        <Text style={{ color: theme.textSecondary, fontWeight: '500' }}>No payments recorded yet</Text>
                                    </View>
                                ) : (
                                    paymentHistory.slice(0, 5).map(p => (
                                        <PaymentHistoryItem key={p.payment_id} payment={p} onPress={(payment) => navigation.navigate('Receipt', { feeData: { ...payment, first_name: staff.full_name, isStaff: true } })} />
                                    ))
                                )}

                                {paymentHistory.length > 5 && (
                                    <TouchableOpacity
                                        style={[styles.viewCycleBtn, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', marginTop: 4 }]}
                                        onPress={() => navigation.navigate('StaffPayments', { staffId: staff.staff_id, staffName: staff.full_name })}
                                    >
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B' }}>View all {paymentHistory.length} payments →</Text>
                                    </TouchableOpacity>
                                )}
                            </Animated.View>
                        )}
                    </View>
                </View>
            </ScrollView>

            <StaffPaymentDrawer
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                staffName={staff?.full_name || 'Staff'}
                payAmount={payAmount}
                setPayAmount={setPayAmount}
                payDays={payDays}
                setPayDays={setPayDays}
                payNotes={payNote}
                setPayNotes={setPayNote}
                payDate={payDate}
                setPayDate={setPayDate}
                payMode={payMode}
                setPayMode={setPayMode}
                payTransactionId={payTransactionId}
                setPayTransactionId={setPayTransactionId}
                payReceiptNumber={payReceiptNumber}
                setPayReceiptNumber={setPayReceiptNumber}
                payLoading={saving}
                onConfirm={handleSavePayment}
                themeColor={theme.primary}
                errors={errors}
            />

            {/* Image Preview Zoom Modal */}
            <Modal visible={!!previewImageUrl} transparent animationType="fade" onRequestClose={() => setPreviewImageUrl(null)}>
                <View style={styles.zoomModalContainer}>
                    <TouchableOpacity style={styles.zoomCloseBtn} onPress={() => setPreviewImageUrl(null)}>
                        <X size={24} color="#FFF" />
                    </TouchableOpacity>
                    {previewImageUrl && (
                        <Image source={{ uri: previewImageUrl }} style={styles.zoomedImage} resizeMode="contain" />
                    )}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },

    docCard: {
        flex: 1,
        height: 110,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
        position: 'relative',
    },
    docCardImg: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    docCardOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 5,
    },
    docCardText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },

    zoomModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.92)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    zoomCloseBtn: {
        position: 'absolute',
        top: 48,
        right: 20,
        zIndex: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 8,
        borderRadius: 20,
    },
    zoomedImage: {
        width: '90%',
        height: '80%',
    },
    
    // Profile Header Styles Matches Student
    profileCard: { borderRadius: 20, padding: 0, marginBottom: 16, overflow: 'hidden', borderWidth: 1 },
    profileSection: { flexDirection: 'row', padding: 20, alignItems: 'center', gap: 16 },
    avatarWrapper: { position: 'relative' },
    avatarPlaceholder: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
    avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: '#FFF' },
    avatarStatusBadge: { position: 'absolute', bottom: 2, right: 2, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#FFF' },

    // Pay / Salary button
    payNowBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 14, borderRadius: 14, marginBottom: 14,
        elevation: 3, shadowColor: '#16A34A', shadowOpacity: 0.25, shadowRadius: 6,
    },
    payNowBtnText: { fontSize: 15, fontWeight: '900', color: '#FFF', letterSpacing: 0.3 },
    profileInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
    name: { fontSize: 20, fontWeight: '800', flex: 1 },
    activeStatusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    activeStatusPillText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    roleInfo: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
    cardBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    cardBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
    cardBadgeText: { fontSize: 10, fontWeight: '700' },
    profileDivider: { height: 1, backgroundColor: 'rgba(148, 163, 184, 0.2)' },
    
    // Quick Actions
    quickActionsRow: { flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 20, justifyContent: 'space-around', alignItems: 'center' },
    quickActionItem: { alignItems: 'center', gap: 8 },
    quickActionCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
    quickActionLabel: { fontSize: 12, fontWeight: '600' },

    // Action Card
    actionCard: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1 },
    actionCardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    actionCardIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    actionStatusInnerDot: { width: 12, height: 12, borderRadius: 6 },
    actionCardContent: { flex: 1 },
    actionCardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
    actionCardSubtitle: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
    actionCardButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
    actionCardButtonText: { fontSize: 12, fontWeight: '700' },

    // Animated Tabs
    tabContainer: { flexDirection: 'row', borderRadius: 16, padding: 4, position: 'relative', marginBottom: 24, borderWidth: 1, height: 48 },
    tabPill: { position: 'absolute', width: '46%', height: '100%', top: 3, borderRadius: 12, elevation: 2, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, zIndex: 1 },
    tabText: { fontSize: 14, fontWeight: '700' },

    contentArea: { paddingHorizontal: 4 },

    infoSectionCard: {
        borderRadius: 20,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
    },
    infoSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: 'rgba(99, 102, 241, 0.05)',
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(99, 102, 241, 0.1)',
    },
    infoSectionHeaderTitle: {
        fontSize: 14,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoSectionBody: {
        padding: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    infoRowIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoRowText: {
        flex: 1,
    },
    infoRowLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
        marginBottom: 4,
    },
    infoRowValue: {
        fontSize: 15,
        fontWeight: '700',
    },
    infoRowDivider: {
        height: 1,
        backgroundColor: 'rgba(148, 163, 184, 0.15)',
        marginVertical: 16,
        marginLeft: 56, // Align with text
    },

    historyCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
    historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    historyIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    historyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    historyDate: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
    historyMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    historySubText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
    historyRight: { alignItems: 'flex-end' },
    historyAmount: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
    
    addPayBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, gap: 6 },
    addPayText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
    
    emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },

    salarySummaryCard: {
        backgroundColor: '#F0FDF4',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },
    viewCycleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    viewCycleBtnText: { flex: 1, fontSize: 13, fontWeight: '800' },
    miniTabBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: '#EEF2FF',
        borderWidth: 1,
        borderColor: '#C7D2FE',
    },
    miniTabBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#4F46E5',
    },
    configurePermsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
        marginTop: 10,
    },
    configurePermsBtnText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
