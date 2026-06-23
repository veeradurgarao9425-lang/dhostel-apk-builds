import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, StatusBar, ActivityIndicator, Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppHeader } from '../components/AppHeader';
import { Calendar, Tag, FileText, Hash, Receipt, Trash2, Edit3 } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
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
    'Other': '#64748B',
    'Others': '#64748B',
    'Others Bill': '#64748B',
    'Miscellaneous': '#64748B',
};

const getCatColor = (name: string) => CAT_COLORS[name] || '#64748B';

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
    const navigation = useNavigation<any>();
    const { expense } = route.params || {};
    const [deleteLoading, setDeleteLoading] = useState(false);

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

                {/* ── Delete Button ── */}
                <TouchableOpacity
                    style={[styles.deleteButton, deleteLoading && styles.disabledButton]}
                    onPress={handleDelete}
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
});

export default ExpenseDetailsScreen;