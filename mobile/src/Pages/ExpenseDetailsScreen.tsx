import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, StatusBar, ActivityIndicator, Image, Modal, Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppHeader } from '../components/AppHeader';
import { Calendar, Tag, FileText, Hash, Receipt, Trash2, Edit3, Image as ImageIcon, Eye, X, Download } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useRefresh } from '../../contexts/RefreshContext';
import { DangerModal } from '../components/ui/DangerModal';
import api from '../services/api';
import Toast from 'react-native-toast-message';

const CAT_COLORS: Record<string, string> = {
    'Electricity': '#F59E0B',
    'Electricity Bill': '#F59E0B',
    'Water': '#0EA5E9',
    'Water Bill': '#0EA5E9',
    'Lift Bill': '#6366F1',
    'Maintenance': '#8B5CF6',
    'Salary': '#10B981',
    'Groceries': '#F97316',
    'Internet': '#06B6D4',
    'Internet Bill': '#06B6D4',
    'Cleaning': '#EC4899',
    'Deposit Refund': '#D97706',
    'Deposit Refunds': '#D97706',
    'Rent': '#15803D',
    'Other': '#64748B',
    'Others': '#64748B',
    'Others Bill': '#64748B',
    'Miscellaneous': '#64748B',
};

const getCatColor = (name: string) => CAT_COLORS[name] || '#64748B';

const getFullImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = 'http://143.244.131.69:8081';
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

// ─── Single detail row ────────────────────────────────────────────────────────
const DetailRow = React.memo(({ icon, label, value, accent, isDark, theme }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    accent?: string;
    isDark: boolean;
    theme: any;
}) => (
    <View style={[rowStyles.row, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[rowStyles.iconWrap, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                {icon}
            </View>
            <Text style={[rowStyles.label, { color: isDark ? '#94A3B8' : '#64748B' }]}>{label}</Text>
        </View>
        <Text style={[rowStyles.value, { color: accent || theme.textPrimary }]} numberOfLines={1}>
            {value || '—'}
        </Text>
    </View>
));

const rowStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    iconWrap: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 1,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
    },
    value: {
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'right',
        maxWidth: '60%',
    },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const ExpenseDetailsScreen = ({ route }: any) => {
    const { theme, isDark } = useTheme();
    const { triggerRefresh } = useRefresh();
    const navigation = useNavigation<any>();
    const { expense } = route.params || {};
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [dangerModalVisible, setDangerModalVisible] = useState(false);
    const [previewModalVisible, setPreviewModalVisible] = useState(false);

    if (!expense) {
        return (
            <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                <Text style={[styles.errorText, { color: theme.textSecondary }]}>No expense details found.</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.goBackBtn}>
                    <Text style={[styles.goBackText, { color: theme.textPrimary }]}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const formattedDate = expense.expense_date
        ? new Date(expense.expense_date).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        })
        : '—';

    const amount = parseFloat(expense.amount || 0);
    const catColor = getCatColor(expense.category_name);
    const imageUrl = getFullImageUrl(expense.attachment_url);

    const executeDelete = async () => {
        try {
            setDeleteLoading(true);
            const response = await api.delete(`/expenses/${expense.expense_id}`);
            if (response.data.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Expense deleted successfully',
                });
                triggerRefresh();
                setDangerModalVisible(false);
                navigation.goBack();
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: response.data.message || 'Failed to delete expense',
                });
            }
        } catch (error) {
            console.error('Error deleting expense:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete expense',
            });
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" />

            {/* ── Compact Header ── */}
            <AppHeader
                title="Expense Details"
                rightComponent={
                    <TouchableOpacity 
                        onPress={() => navigation.navigate('AddExpense', { expense })} 
                        style={styles.editBtn}
                    >
                        <Edit3 color="#FFF" size={20} />
                    </TouchableOpacity>
                }
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Compact Summary Card ── */}
                <View style={[styles.summaryCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                    <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Amount Spent</Text>
                    <Text style={styles.summaryAmount}>
                        -₹{amount.toLocaleString('en-IN')}
                    </Text>
                    
                    <View style={[styles.categoryBadge, { backgroundColor: catColor + '15', borderColor: catColor + '30' }]}>
                        <Tag size={12} color={catColor} style={{ marginRight: 6 }} />
                        <Text style={[styles.categoryBadgeText, { color: catColor }]}>
                            {expense.category_name}
                        </Text>
                    </View>
                </View>

                {/* ── Details List Card ── */}
                <View style={[styles.detailsCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                    <DetailRow
                        icon={<Calendar size={16} color={isDark ? '#94A3B8' : '#64748B'} />}
                        label="Date"
                        value={formattedDate}
                        isDark={isDark}
                        theme={theme}
                    />
                    <DetailRow
                        icon={<Receipt size={16} color={isDark ? '#94A3B8' : '#64748B'} />}
                        label="Payment Mode"
                        value={expense.payment_mode || 'Cash'}
                        isDark={isDark}
                        theme={theme}
                    />
                    <DetailRow
                        icon={<FileText size={16} color={isDark ? '#94A3B8' : '#64748B'} />}
                        label="Vendor"
                        value={expense.vendor_name || '—'}
                        isDark={isDark}
                        theme={theme}
                    />
                    <DetailRow
                        icon={<Hash size={16} color={isDark ? '#94A3B8' : '#64748B'} />}
                        label="Bill Number"
                        value={expense.bill_number || '—'}
                        isDark={isDark}
                        theme={theme}
                    />
                </View>

                {/* ── Description Card ── */}
                <View style={[styles.detailsCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#E2E8F0', marginTop: 12 }]}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Description</Text>
                    <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>
                        {expense.description || 'No additional details provided.'}
                    </Text>
                </View>

                {/* ── Attachment Preview Card ── */}
                {imageUrl && (
                    <View style={[styles.detailsCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#E2E8F0', marginTop: 12 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: 0 }]}>Receipt Attachment</Text>
                            <TouchableOpacity onPress={() => setPreviewModalVisible(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Eye size={14} color={theme.primary} />
                                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primary }}>Preview</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={() => setPreviewModalVisible(true)} activeOpacity={0.85} style={styles.imagePreviewWrapper}>
                            <Image source={{ uri: imageUrl }} style={styles.attachmentThumbnail} resizeMode="cover" />
                            <View style={styles.previewOverlayBadge}>
                                <Eye size={14} color="#FFF" />
                                <Text style={styles.previewBadgeText}>Tap to Zoom</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Delete Button ── */}
                <TouchableOpacity
                    style={[styles.deleteButton, deleteLoading && styles.disabledButton]}
                    onPress={() => setDangerModalVisible(true)}
                    disabled={deleteLoading}
                >
                    {deleteLoading ? (
                        <ActivityIndicator color="#EF4444" size="small" />
                    ) : (
                        <>
                            <Trash2 size={16} color="#EF4444" style={{ marginRight: 8 }} />
                            <Text style={styles.deleteButtonText}>Delete Expense</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {/* ── Fullscreen Receipt Viewer Modal ── */}
            <Modal visible={previewModalVisible} transparent animationType="fade" onRequestClose={() => setPreviewModalVisible(false)}>
                <View style={styles.fullScreenModalOverlay}>
                    <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPreviewModalVisible(false)}>
                        <X size={24} color="#FFF" />
                    </TouchableOpacity>
                    {imageUrl && (
                        <Image
                            source={{ uri: imageUrl }}
                            style={styles.fullScreenImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

            {/* ── Reusable Danger Modal ── */}
            <DangerModal
                visible={dangerModalVisible}
                title="Delete Expense"
                message={`Are you sure you want to delete this expense of ₹${amount.toLocaleString('en-IN')}? This cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={executeDelete}
                onCancel={() => setDangerModalVisible(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontSize: 16, marginBottom: 20 },
    goBackBtn: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#E2E8F0', borderRadius: 10 },
    goBackText: { fontSize: 14, fontWeight: '600' },
    editBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    
    // Summary Card
    summaryCard: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 20,
        alignItems: 'center',
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.02,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    summaryLabel: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    summaryAmount: {
        fontSize: 32,
        fontWeight: '800',
        color: '#EF4444',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
    },
    categoryBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },

    // Details list card
    detailsCard: {
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 8,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.02,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 6,
        marginBottom: 8,
    },
    descriptionText: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 6,
    },

    // Delete Button
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FEE2E2',
        borderRadius: 14,
        paddingVertical: 14,
        marginTop: 20,
    },
    deleteButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#EF4444',
    },
    disabledButton: {
        opacity: 0.7,
    },
    imagePreviewWrapper: {
        borderRadius: 14,
        overflow: 'hidden',
        position: 'relative',
        height: 180,
        backgroundColor: '#0F172A',
        marginTop: 4,
    },
    attachmentThumbnail: {
        width: '100%',
        height: '100%',
    },
    previewOverlayBadge: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    previewBadgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },
    fullScreenModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseBtn: {
        position: 'absolute',
        top: 48,
        right: 20,
        zIndex: 10,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenImage: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height * 0.8,
    },
});

export default ExpenseDetailsScreen;