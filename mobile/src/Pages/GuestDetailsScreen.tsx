import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
    Image,
    Modal,
    TextInput,
    StatusBar,
    RefreshControl,
    Platform,
    Share,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    User, Phone, Mail, MapPin, Calendar, Clock, CreditCard,
    FileText, CheckCircle, AlertTriangle, Download, Edit2, Trash2, X, Check, Share2, Info
} from 'lucide-react-native';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../context/ToastContext';
import { getResolvedImageUrl } from '../utils/imageHelper';
import api from '../services/api';
import { DangerModal } from '../components/ui/DangerModal';
import { ModalSheet } from '../components/FormComponents';

const fmtDate = (d?: string) => {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return d;
    }
};

export default function GuestDetailsScreen({ route, navigation }: any) {
    const { guestId, guest: initialGuest } = route.params || {};
    const { theme, isDark } = useTheme();
    const { showToast, showSuccess, showApiError } = useToast();

    const [guest, setGuest] = useState<any>(initialGuest || null);
    const [loading, setLoading] = useState(!initialGuest);
    const [refreshing, setRefreshing] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Danger modal (checkout or delete)
    const [dangerModal, setDangerModal] = useState<{ visible: boolean; mode: 'checkout' | 'delete' }>({
        visible: false, mode: 'checkout'
    });

    // Auto-bill checkout sheet
    const [checkoutSheet, setCheckoutSheet] = useState<{ visible: boolean; totalBill: number; finalAmount: string }>({
        visible: false, totalBill: 0, finalAmount: ''
    });
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    const fetchGuestDetails = useCallback(async () => {
        if (!guestId && !initialGuest?.guest_id) return;
        const id = guestId || initialGuest?.guest_id;
        try {
            const res = await api.get(`/guests`);
            if (res.data?.success) {
                const found = (res.data.data || []).find((g: any) => g.guest_id === id);
                if (found) {
                    setGuest(found);
                }
            }
        } catch (e) {
            console.error('Failed to fetch guest details:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [guestId, initialGuest]);

    useEffect(() => {
        fetchGuestDetails();
    }, [fetchGuestDetails]);

    const handleOpenCheckout = () => {
        if (!guest) return;
        const days = Number(guest.days || 1);
        const perDay = Number(guest.per_day_amount || (guest.amount_paid ? Number(guest.amount_paid) / days : 0));
        const totalBill = days * perDay;
        setCheckoutSheet({
            visible: true,
            totalBill,
            finalAmount: String(totalBill > 0 ? totalBill : guest.amount_paid || 0),
        });
    };

    const handleConfirmCheckout = async () => {
        if (!guest) return;
        setCheckoutLoading(true);
        try {
            const res = await api.post(`/guests/${guest.guest_id}/checkout`, {
                amount_paid: parseFloat(checkoutSheet.finalAmount || '0'),
            });
            if (res.data?.success) {
                showSuccess('Guest checked out successfully');
                setCheckoutSheet(p => ({ ...p, visible: false }));
                setGuest((prev: any) => ({ ...prev, status: 'checked_out', is_overstay: false, amount_paid: checkoutSheet.finalAmount }));
            }
        } catch (e) {
            showApiError(e, 'Failed to checkout guest');
        } finally {
            setCheckoutLoading(false);
        }
    };

    const handleDeleteGuest = async () => {
        if (!guest) return;
        try {
            const res = await api.delete(`/guests/${guest.guest_id}`);
            if (res.data?.success) {
                showSuccess('Guest record deleted');
                setDangerModal(p => ({ ...p, visible: false }));
                navigation.goBack();
            }
        } catch (e) {
            showApiError(e, 'Failed to delete guest');
        }
    };

    const handleShare = async () => {
        if (!guest) return;
        try {
            await Share.share({
                message: `*Guest Details — Hostix PG*\nName: ${guest.full_name}\nPhone: ${guest.phone || 'N/A'}\nRoom: ${guest.room_number || 'N/A'}\nCheck-in: ${fmtDate(guest.check_in_date)}\nCheck-out: ${fmtDate(guest.check_out_date)}\nStatus: ${(guest.status || 'staying').toUpperCase()}`,
            });
        } catch (e) {}
    };

    if (!guest) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <AppHeader title="Guest Details" showBack={true} />
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: theme.textSecondary, fontSize: 14 }}>Loading guest details...</Text>
                </View>
            </View>
        );
    }

    const isStaying = guest.status === 'staying';
    const isOverstay = !!guest.is_overstay;
    const isCheckedOut = guest.status === 'checked_out';
    const ratePerDay = Number(guest.per_day_amount || (guest.amount_paid && guest.days ? Number(guest.amount_paid) / Number(guest.days) : 0));
    const totalDays = Number(guest.days || 1);
    const totalExpectedAmount = ratePerDay * totalDays;
    const amountPaid = Number(guest.amount_paid || 0);
    const balanceDue = Math.max(0, totalExpectedAmount - amountPaid);

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0B0F19' : '#F8FAFC' }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            
            <AppHeader 
                title="Guest Details" 
                subtitle="Short-stay visitor profile"
                showBack={true}
                alignLeft={true}
                rightComponent={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <TouchableOpacity 
                            onPress={() => navigation.navigate('AddGuest', { guest, isEdit: true })}
                            activeOpacity={0.75} 
                            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Ionicons name="create-outline" size={19} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={handleShare} 
                            activeOpacity={0.75} 
                            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Ionicons name="share-social-outline" size={19} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                }
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchGuestDetails(); }} />}
            >
                {/* ── 1. Hero Profile Card ── */}
                <View style={[styles.heroCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                    <View style={styles.heroTopRow}>
                        <TouchableOpacity
                            activeOpacity={guest.profile_photo_url ? 0.8 : 1}
                            onPress={() => guest.profile_photo_url && setPreviewImage(getResolvedImageUrl(guest.profile_photo_url))}
                            style={[styles.avatarBox, { borderColor: theme.primary, backgroundColor: isDark ? '#334155' : '#EEF2FF' }]}
                        >
                            {guest.profile_photo_url ? (
                                <Image source={{ uri: getResolvedImageUrl(guest.profile_photo_url)! }} style={styles.avatarImg} />
                            ) : (
                                <Text style={[styles.avatarLetter, { color: theme.primary }]}>
                                    {(guest.full_name || 'G')[0].toUpperCase()}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <View style={{ flex: 1 }}>
                            <Text style={[styles.guestName, { color: theme.textPrimary }]}>{guest.full_name}</Text>
                            
                            <View style={styles.badgesRow}>
                                <View style={[styles.genderPill, { backgroundColor: guest.gender === 'Female' ? '#FDF2F8' : '#EFF6FF' }]}>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: guest.gender === 'Female' ? '#DB2777' : '#2563EB' }}>
                                        {guest.gender || 'Male'}
                                    </Text>
                                </View>

                                {isOverstay ? (
                                    <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
                                        <AlertTriangle size={11} color="#DC2626" />
                                        <Text style={[styles.statusBadgeText, { color: '#DC2626' }]}>OVERSTAY</Text>
                                    </View>
                                ) : isCheckedOut ? (
                                    <View style={[styles.statusBadge, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
                                        <CheckCircle size={11} color="#64748B" />
                                        <Text style={[styles.statusBadgeText, { color: '#64748B' }]}>CHECKED OUT</Text>
                                    </View>
                                ) : (
                                    <View style={[styles.statusBadge, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                                        <CheckCircle size={11} color="#059669" />
                                        <Text style={[styles.statusBadgeText, { color: '#059669' }]}>ACTIVE STAY</Text>
                                    </View>
                                )}
                            </View>

                            <Text style={[styles.stayDatesSub, { color: theme.textSecondary }]}>
                                Check-in: {fmtDate(guest.check_in_date)}
                            </Text>
                        </View>
                    </View>

                    {/* Quick Action Contact Row */}
                    <View style={styles.quickActionRow}>
                        {!!guest.phone && (
                            <TouchableOpacity
                                style={[styles.quickBtn, { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }]}
                                onPress={() => Linking.openURL(`tel:${guest.phone}`)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="call" size={15} color="#16A34A" />
                                <Text style={[styles.quickBtnText, { color: '#16A34A' }]}>Call</Text>
                            </TouchableOpacity>
                        )}

                        {!!guest.phone && (
                            <TouchableOpacity
                                style={[styles.quickBtn, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}
                                onPress={() => Linking.openURL(`https://wa.me/91${guest.phone.replace(/\D/g, '')}`)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="logo-whatsapp" size={15} color="#15803D" />
                                <Text style={[styles.quickBtnText, { color: '#15803D' }]}>WhatsApp</Text>
                            </TouchableOpacity>
                        )}

                        {!!guest.email && (
                            <TouchableOpacity
                                style={[styles.quickBtn, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}
                                onPress={() => Linking.openURL(`mailto:${guest.email}`)}
                                activeOpacity={0.8}
                            >
                                <Mail size={14} color="#4F46E5" />
                                <Text style={[styles.quickBtnText, { color: '#4F46E5' }]}>Email</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.quickBtn, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}
                            onPress={() => navigation.navigate('AddGuest', { guest, isEdit: true })}
                            activeOpacity={0.8}
                        >
                            <Edit2 size={13} color="#475569" />
                            <Text style={[styles.quickBtnText, { color: '#475569' }]}>Edit</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── 2. Stay & Room Allocation Details ── */}
                <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                    <View style={styles.sectionHeaderRow}>
                        <Ionicons name="bed-outline" size={16} color={theme.primary} />
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Stay & Room Information</Text>
                    </View>

                    <View style={styles.gridContainer}>
                        <View style={styles.gridItem}>
                            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Allocated Room</Text>
                            <Text style={[styles.fieldValue, { color: theme.textPrimary }]}>
                                {guest.room_number ? `Room ${guest.room_number}` : 'Unallocated'}
                            </Text>
                        </View>

                        <View style={styles.gridItem}>
                            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Stay Duration</Text>
                            <Text style={[styles.fieldValue, { color: theme.textPrimary }]}>
                                {guest.days} {guest.days === 1 ? 'Day' : 'Days'}
                            </Text>
                        </View>

                        <View style={styles.gridItem}>
                            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Check-In Date</Text>
                            <Text style={[styles.fieldValue, { color: theme.textPrimary }]}>
                                {fmtDate(guest.check_in_date)}
                            </Text>
                        </View>

                        <View style={styles.gridItem}>
                            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Expected Check-Out</Text>
                            <Text style={[styles.fieldValue, { color: isOverstay ? '#DC2626' : theme.textPrimary }]}>
                                {fmtDate(guest.check_out_date)}
                            </Text>
                        </View>
                    </View>

                    {!!guest.purpose && (
                        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: isDark ? '#334155' : '#F1F5F9' }}>
                            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Purpose of Visit</Text>
                            <Text style={[styles.fieldValue, { color: theme.textPrimary, marginTop: 2 }]}>{guest.purpose}</Text>
                        </View>
                    )}
                </View>

                {/* ── 3. Billing & Payment Summary ── */}
                <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                    <View style={styles.sectionHeaderRow}>
                        <CreditCard size={16} color="#10B981" />
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Billing & Financial Summary</Text>
                    </View>

                    <View style={[styles.billSummaryBox, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <View style={styles.billLine}>
                            <Text style={[styles.billLabel, { color: theme.textSecondary }]}>Rate Per Day</Text>
                            <Text style={[styles.billVal, { color: theme.textPrimary }]}>₹{ratePerDay.toLocaleString('en-IN')}</Text>
                        </View>

                        <View style={styles.billLine}>
                            <Text style={[styles.billLabel, { color: theme.textSecondary }]}>Total Stay Bill ({totalDays} days)</Text>
                            <Text style={[styles.billVal, { color: theme.textPrimary, fontWeight: '800' }]}>₹{totalExpectedAmount.toLocaleString('en-IN')}</Text>
                        </View>

                        <View style={styles.billLine}>
                            <Text style={[styles.billLabel, { color: theme.textSecondary }]}>Amount Paid / Collected</Text>
                            <Text style={[styles.billVal, { color: '#10B981', fontWeight: '800' }]}>₹{amountPaid.toLocaleString('en-IN')}</Text>
                        </View>

                        <View style={[styles.billLine, { borderTopWidth: 1, borderTopColor: isDark ? '#334155' : '#E2E8F0', paddingTop: 8, marginTop: 4 }]}>
                            <Text style={[styles.billLabel, { color: theme.textPrimary, fontWeight: '700' }]}>Balance Due</Text>
                            <Text style={[styles.billVal, { color: balanceDue > 0 ? '#DC2626' : '#10B981', fontWeight: '900', fontSize: 15 }]}>
                                ₹{balanceDue.toLocaleString('en-IN')}
                            </Text>
                        </View>
                    </View>

                    {isStaying && (
                        <TouchableOpacity
                            style={[styles.primaryActionBtn, { backgroundColor: '#059669', marginTop: 14 }]}
                            onPress={handleOpenCheckout}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="log-out-outline" size={17} color="#FFF" />
                            <Text style={styles.primaryActionBtnText}>Checkout & Finalize Bill</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── 4. KYC & ID Proof Documents ── */}
                <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                    <View style={styles.sectionHeaderRow}>
                        <FileText size={16} color="#6366F1" />
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Identity Proof & KYC</Text>
                    </View>

                    <View style={{ marginBottom: 12 }}>
                        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Document Number</Text>
                        <Text style={[styles.fieldValue, { color: theme.textPrimary, fontFamily: 'monospace', fontWeight: '800' }]}>
                            {guest.id_proof_number || 'Not provided'}
                        </Text>
                    </View>

                    <View style={styles.docImagesRow}>
                        {/* Front Side */}
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.docLabel, { color: theme.textSecondary }]}>Front Side</Text>
                            <TouchableOpacity
                                activeOpacity={guest.id_proof_front_url ? 0.85 : 1}
                                onPress={() => guest.id_proof_front_url && setPreviewImage(getResolvedImageUrl(guest.id_proof_front_url))}
                                style={[styles.docPreviewCard, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                            >
                                {guest.id_proof_front_url ? (
                                    <Image source={{ uri: getResolvedImageUrl(guest.id_proof_front_url)! }} style={styles.docImage} resizeMode="cover" />
                                ) : (
                                    <View style={styles.docEmptyWrap}>
                                        <Ionicons name="document-text-outline" size={24} color="#94A3B8" />
                                        <Text style={styles.docEmptyText}>No Front Photo</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Back Side */}
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.docLabel, { color: theme.textSecondary }]}>Back Side</Text>
                            <TouchableOpacity
                                activeOpacity={guest.id_proof_back_url ? 0.85 : 1}
                                onPress={() => guest.id_proof_back_url && setPreviewImage(getResolvedImageUrl(guest.id_proof_back_url))}
                                style={[styles.docPreviewCard, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                            >
                                {guest.id_proof_back_url ? (
                                    <Image source={{ uri: getResolvedImageUrl(guest.id_proof_back_url)! }} style={styles.docImage} resizeMode="cover" />
                                ) : (
                                    <View style={styles.docEmptyWrap}>
                                        <Ionicons name="document-text-outline" size={24} color="#94A3B8" />
                                        <Text style={styles.docEmptyText}>No Back Photo</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* ── 5. Notes / Remarks ── */}
                {!!guest.notes && (
                    <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <View style={styles.sectionHeaderRow}>
                            <Info size={16} color="#64748B" />
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Remarks & Notes</Text>
                        </View>
                        <Text style={[styles.notesText, { color: theme.textSecondary }]}>{guest.notes}</Text>
                    </View>
                )}

                {/* Delete Action Button */}
                <TouchableOpacity
                    style={[styles.deleteBtn, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}
                    onPress={() => setDangerModal({ visible: true, mode: 'delete' })}
                    activeOpacity={0.8}
                >
                    <Trash2 size={15} color="#DC2626" />
                    <Text style={styles.deleteBtnText}>Delete Guest Record</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Image Preview Modal */}
            <Modal visible={!!previewImage} transparent={true} animationType="fade" onRequestClose={() => setPreviewImage(null)}>
                <View style={styles.modalBg}>
                    <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPreviewImage(null)}>
                        <Ionicons name="close" size={24} color="#FFF" />
                    </TouchableOpacity>
                    {previewImage && (
                        <Image source={{ uri: previewImage }} style={styles.fullImage} resizeMode="contain" />
                    )}
                </View>
            </Modal>

            {/* Danger Modal */}
            <DangerModal
                visible={dangerModal.visible}
                title="Delete Guest Record?"
                message={`Are you sure you want to permanently remove the record for "${guest.full_name}"? This action cannot be undone.`}
                confirmText="Yes, Delete"
                cancelText="Cancel"
                onConfirm={handleDeleteGuest}
                onCancel={() => setDangerModal(p => ({ ...p, visible: false }))}
            />

            {/* ── Auto-Bill Checkout Modal Sheet ── */}
            <ModalSheet visible={checkoutSheet.visible} onClose={() => setCheckoutSheet(p => ({ ...p, visible: false }))}>
                <View style={{ padding: 20 }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 }}>
                        Checkout Guest
                    </Text>
                    <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 16 }}>
                        Review and collect stay bill for <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{guest.full_name}</Text>
                    </Text>

                    <View style={{ backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: isDark ? '#334155' : '#E2E8F0' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                            <Text style={{ fontSize: 13, color: theme.textSecondary }}>Stay Duration</Text>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }}>{guest.days} Days</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                            <Text style={{ fontSize: 13, color: theme.textSecondary }}>Rate per Day</Text>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }}>₹{ratePerDay.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: isDark ? '#334155' : '#E2E8F0' }}>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: theme.textPrimary }}>Total Calculated</Text>
                            <Text style={{ fontSize: 16, fontWeight: '900', color: '#059669' }}>₹{checkoutSheet.totalBill.toLocaleString('en-IN')}</Text>
                        </View>
                    </View>

                    <View style={{ marginBottom: 20 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 6 }}>
                            Amount to Settle / Collect (₹)
                        </Text>
                        <TextInput
                            style={{ backgroundColor: isDark ? '#1E293B' : '#FFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, fontWeight: '800', color: theme.textPrimary }}
                            keyboardType="numeric"
                            value={checkoutSheet.finalAmount}
                            onChangeText={(v) => setCheckoutSheet(p => ({ ...p, finalAmount: v.replace(/[^0-9.]/g, '') }))}
                        />
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                            style={{ flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: isDark ? '#334155' : '#F1F5F9', alignItems: 'center' }}
                            onPress={() => setCheckoutSheet(p => ({ ...p, visible: false }))}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#CBD5E1' : '#64748B' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{ flex: 2, paddingVertical: 13, borderRadius: 12, backgroundColor: '#059669', alignItems: 'center', opacity: checkoutLoading ? 0.7 : 1 }}
                            onPress={handleConfirmCheckout}
                            disabled={checkoutLoading}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFF' }}>
                                {checkoutLoading ? 'Processing...' : `Settle & Checkout`}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ModalSheet>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        gap: 14,
    },
    heroCard: {
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    heroTopRow: {
        flexDirection: 'row',
        gap: 14,
        alignItems: 'center',
    },
    avatarBox: {
        width: 68,
        height: 68,
        borderRadius: 22,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    avatarLetter: {
        fontSize: 26,
        fontWeight: '900',
    },
    guestName: {
        fontSize: 19,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    badgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
        flexWrap: 'wrap',
    },
    genderPill: {
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        borderRadius: 6,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        borderRadius: 6,
        borderWidth: 1,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.3,
    },
    stayDatesSub: {
        fontSize: 11.5,
        marginTop: 6,
        fontWeight: '500',
    },
    quickActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 16,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    quickBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
    },
    quickBtnText: {
        fontSize: 12,
        fontWeight: '700',
    },
    sectionCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: -0.1,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    gridItem: {
        width: '47%',
    },
    fieldLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 3,
    },
    fieldValue: {
        fontSize: 13.5,
        fontWeight: '700',
    },
    billSummaryBox: {
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        gap: 8,
    },
    billLine: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    billLabel: {
        fontSize: 12.5,
        fontWeight: '500',
    },
    billVal: {
        fontSize: 13,
        fontWeight: '700',
    },
    primaryActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 12,
    },
    primaryActionBtnText: {
        color: '#FFF',
        fontSize: 13.5,
        fontWeight: '800',
    },
    docImagesRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 6,
    },
    docLabel: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 6,
    },
    docPreviewCard: {
        height: 110,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    docImage: {
        width: '100%',
        height: '100%',
    },
    docEmptyWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    docEmptyText: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '600',
    },
    notesText: {
        fontSize: 13,
        lineHeight: 18,
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 6,
    },
    deleteBtnText: {
        color: '#DC2626',
        fontSize: 13,
        fontWeight: '700',
    },
    modalBg: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
    fullImage: {
        width: '90%',
        height: '80%',
    },
});
