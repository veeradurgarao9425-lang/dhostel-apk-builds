import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, StatusBar, Dimensions, Alert, ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppHeader } from '../components/AppHeader';
import {
    Calendar, Tag, FileText,
    Hash, Receipt, TrendingDown, Trash2, Edit3
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../services/api';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

// ─── Single detail row ────────────────────────────────────────────────────────
const DetailRow = React.memo(({ icon, label, value, accent }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    accent?: string;
}) => (
    <View style={rowStyles.row}>
        <View style={rowStyles.iconWrap}>{icon}</View>
        <View style={rowStyles.textWrap}>
            <Text style={rowStyles.label}>{label}</Text>
            <Text style={[rowStyles.value, accent ? { color: accent } : null]}>{value || '—'}</Text>
        </View>
    </View>
));

const rowStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    iconWrap: {
        width: 38,
        height: 38,
        borderRadius: 11,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    textWrap: { flex: 1, justifyContent: 'center' },
    label: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 3,
    },
    value: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1E293B',
        lineHeight: 22,
    },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const ExpenseDetailsScreen = ({ route }: any) => {
    const { theme } = useTheme();
    const navigation = useNavigation<any>();
    const { expense } = route.params || {};
    const [deleteLoading, setDeleteLoading] = useState(false);

    if (!expense) {
        return (
            <View style={styles.errorContainer}>
                <StatusBar barStyle="dark-content" />
                <Text style={styles.errorText}>No expense details found.</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.goBackBtn}>
                    <Text style={styles.goBackText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const formattedDate = expense.expense_date
        ? new Date(expense.expense_date).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric'
        })
        : '—';

    const amount = parseFloat(expense.amount || 0);

    const handleDelete = () => {
        Alert.alert(
            'Delete Expense',
            `Are you sure you want to delete this expense of ₹${amount.toLocaleString('en-IN')}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setDeleteLoading(true);
                            const response = await api.delete(`/expenses/${expense.expense_id}`);
                            if (response.data.success) {
                                Toast.show({
                                    type: 'success',
                                    text1: 'Success',
                                    text2: 'Expense deleted successfully',
                                });
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
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* ── HEADER ─────────────────────────────────────────────── */}
            <AppHeader
                title="Expense Details"
                rightComponent={
                    <TouchableOpacity 
                        onPress={() => navigation.navigate('AddExpense', { expense })} 
                        style={styles.editBtn}
                    >
                        <Edit3 color="#FFF" size={22} />
                    </TouchableOpacity>
                }
            >
                {/* Category chip */}
                <View style={styles.categoryChip}>
                    <Tag size={11} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.categoryText}>
                        {expense.category_name || 'Expense'}
                    </Text>
                </View>

                {/* Big amount */}
                <Text style={styles.amountLabel}>AMOUNT SPENT</Text>
                <Text style={styles.amountValue}>
                    ₹{amount.toLocaleString('en-IN')}
                </Text>

                {/* Title/Description below amount */}
                <Text style={styles.expenseTitle} numberOfLines={2}>
                    {expense.description || expense.category_name}
                </Text>
                <View style={{ height: 16 }} />
            </AppHeader>

            {/* ── DETAILS CARD (overlaps header) ─────────────────────── */}
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.card}>
                    {/* Visual accent bar at top of card */}
                    <View style={[styles.cardAccent, { backgroundColor: theme.gradientStart }]} />

                    <DetailRow
                        icon={<Tag size={17} color="#64748B" />}
                        label="Category"
                        value={expense.category_name}
                    />
                    <DetailRow
                        icon={<TrendingDown size={17} color="#EF4444" />}
                        label="Amount"
                        value={`₹${amount.toLocaleString('en-IN')}`}
                        accent="#EF4444"
                    />
                    <DetailRow
                        icon={<Calendar size={17} color="#64748B" />}
                        label="Date"
                        value={formattedDate}
                    />
                    <DetailRow
                        icon={<Receipt size={17} color="#64748B" />}
                        label="Payment Mode"
                        value={expense.payment_mode || 'Cash'}
                    />
                    <DetailRow
                        icon={<FileText size={17} color="#64748B" />}
                        label="Vendor Name"
                        value={expense.vendor_name || 'Generic Vendor'}
                    />
                    <DetailRow
                        icon={<Hash size={17} color="#64748B" />}
                        label="Bill Number"
                        value={expense.bill_number || '—'}
                    />

                    {/* Description */}
                    <View style={[rowStyles.row, { borderBottomWidth: 0 }]}>
                        <View style={rowStyles.iconWrap}>
                            <FileText size={17} color="#64748B" />
                        </View>
                        <View style={rowStyles.textWrap}>
                            <Text style={rowStyles.label}>Description</Text>
                            <Text style={rowStyles.value}>
                                {expense.description || 'No additional details provided.'}
                            </Text>
                        </View>
                    </View>

                    {/* Delete Expense Button */}
                    <TouchableOpacity
                        style={[styles.deleteButton, deleteLoading && styles.disabledButton]}
                        onPress={handleDelete}
                        disabled={deleteLoading}
                    >
                        {deleteLoading ? (
                            <ActivityIndicator color="#EF4444" size="small" />
                        ) : (
                            <>
                                <Trash2 size={18} color="#EF4444" style={{ marginRight: 8 }} />
                                <Text style={styles.deleteButtonText}>Delete Expense</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },

    // ── Error state ───────────────────────────────────────────────────────
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
    errorText: { fontSize: 16, color: '#64748B', marginBottom: 20 },
    goBackBtn: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#E2E8F0', borderRadius: 10 },
    goBackText: { fontSize: 14, fontWeight: '600', color: '#475569' },

    // ── Header ────────────────────────────────────────────────────────────
    header: {
        paddingTop: 60,
        paddingBottom: 50,         // extra padding so card overlap looks good
        paddingHorizontal: 24,
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    editBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 5,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.9)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    amountLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    amountValue: {
        fontSize: 48,
        fontWeight: '900',
        color: '#FFF',
        marginBottom: 8,
        letterSpacing: -1,
    },
    expenseTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.8)',
        lineHeight: 22,
    },

    // ── Scroll + card ─────────────────────────────────────────────────────
    scroll: { flex: 1, marginTop: -28 },   // pull card up over header
    scrollContent: { paddingHorizontal: 20, paddingBottom: 60 },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 0,
        paddingBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        overflow: 'hidden',
    },
    cardAccent: {
        height: 4,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginBottom: 8,
    },
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
        marginBottom: 10,
    },
    deleteButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#EF4444',
    },
    disabledButton: {
        opacity: 0.7,
    },
});

export default ExpenseDetailsScreen;