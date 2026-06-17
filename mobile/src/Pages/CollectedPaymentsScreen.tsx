import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, StatusBar, ActivityIndicator, Dimensions, Linking, Modal, Alert, TextInput
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Download, X } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

function toLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export default function CollectedPaymentsScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { theme } = useTheme();

    const [refDate, setRefDate] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [showExportModal, setShowExportModal] = useState(false);
    const [exportStart, setExportStart] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d;
    });
    const [exportEnd, setExportEnd] = useState(new Date());
    const [isExporting, setIsExporting] = useState(false);
    const [isStartDatePickerVisible, setStartDatePickerVisible] = useState(false);
    const [isEndDatePickerVisible, setEndDatePickerVisible] = useState(false);
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);

    const load = useCallback(async (showIndicator = true) => {
        if (showIndicator) setLoading(true);
        setError(null);
        try {
            const dateStr = toLocalDateString(refDate);
            const res = await api.get('/income/analytics', {
                params: { type: 'month', date: dateStr },
                timeout: 15000,
            });

            if (res.data?.success) {
                setData(res.data.data ?? null);
            } else {
                setData(null);
                setError(res.data?.message || 'No data returned from server.');
            }
        } catch (e: any) {
            console.log(e);
            setData(null);
            if (e?.code === 'ECONNABORTED') {
                setError('Request timed out. Check your connection.');
            } else {
                setError('Failed to load data. Tap to retry.');
            }
        } finally {
            setLoading(false);
        }
    }, [refDate]);

    useEffect(() => {
        load();
    }, [load]);

    const shiftMonth = (dir: -1 | 1) => {
        const d = new Date(refDate);
        d.setMonth(d.getMonth() + dir);
        setRefDate(new Date(d));
    };

    const canGoForward = (): boolean => {
        const today = new Date();
        return !(refDate.getFullYear() === today.getFullYear() && refDate.getMonth() === today.getMonth());
    };

    const handleExport = async () => {
        if (exportStart > exportEnd) {
            Alert.alert('Invalid Range', 'Start date must be before end date.');
            return;
        }

        setIsExporting(true);
        try {
            const startStr = toLocalDateString(exportStart);
            const endStr = toLocalDateString(exportEnd);
            const token = await AsyncStorage.getItem('token');

            if (!token) {
                Alert.alert('Error', 'Authentication token not found. Please log in again.');
                return;
            }

            const baseURL = (api.defaults.baseURL || 'http://192.168.1.4:5000/api').replace(/\/$/, '');
            const exportUrl = `${baseURL}/income/export?startDate=${startStr}&endDate=${endStr}&token=${encodeURIComponent(token)}&all=true`;

            const supported = await Linking.canOpenURL(exportUrl);
            if (supported) {
                await Linking.openURL(exportUrl);
                setShowExportModal(false);
            } else {
                Alert.alert('Error', 'Cannot open export link');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to export data');
        } finally {
            setIsExporting(false);
        }
    };

    const total = data?.total_amount ?? 0;
    const transactionsList = data?.transactions ?? [];
    const transactionsCount = transactionsList.length;

    const filteredTransactions = transactionsList.filter((item: any) => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        const titleMatch = (item.title || '').toLowerCase().includes(q);
        const subMatch = (item.subtitle || '').toLowerCase().includes(q);
        const roomMatch = item.room_number ? item.room_number.toString().includes(q) : false;
        return titleMatch || subMatch || roomMatch;
    });

    const getMonthLabel = (date: Date): string => {
        return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    };

    const renderTransactionCard = (item: any, idx: number) => {
        const payDate = new Date(item.date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        const isRent = item.type === 'Rent';

        return (
            <TouchableOpacity
                key={item.id ?? idx}
                style={s.premiumCard}
                onPress={() => {
                    if (item.student_id) {
                        navigation.navigate('TenantTransactions', { studentId: item.student_id, studentName: item.title });
                    }
                }}
                activeOpacity={0.9}
            >
                <View style={[s.cardAccentLine, { backgroundColor: isRent ? '#10B981' : '#F59E0B' }]} />

                <View style={s.cardInner}>
                    <View style={s.cardHeaderRow}>
                        <View style={[s.cardAvatarBg, { backgroundColor: isRent ? '#E2FBE9' : '#FEF3C7' }]}>
                            <Ionicons name={isRent ? "person" : "wallet"} size={18} color={isRent ? "#059669" : "#D97706"} />
                        </View>
                        <View style={s.cardNameBlock}>
                            <Text style={s.cardNameText}>{item.title}</Text>
                            {isRent && item.room_number && (
                                <View style={s.roomBadge}>
                                    <Text style={s.roomBadgeText}>Room {item.room_number}</Text>
                                </View>
                            )}
                        </View>
                        <View style={s.cardRightBlock}>
                            <Text style={[s.cardAmtText, { color: isRent ? '#059669' : '#D97706' }]}>
                                ₹{item.amount.toLocaleString('en-IN')}
                            </Text>
                            <Text style={s.cardStatusSub}>Paid</Text>
                        </View>
                    </View>

                    <View style={s.columnsBlock}>
                        <View style={s.colItem}>
                            <Text style={s.colLabel}>Total</Text>
                            <Text style={s.colValue}>₹{item.amount.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={s.colDivider} />
                        <View style={s.colItem}>
                            <Text style={[s.colLabel, { color: '#059669' }]}>Paid</Text>
                            <Text style={[s.colValue, { color: '#059669' }]}>₹{item.amount.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={s.colDivider} />
                        <View style={s.colItem}>
                            <Text style={[s.colLabel, { color: '#DC2626' }]}>Pending</Text>
                            <Text style={[s.colValue, { color: '#DC2626' }]}>₹0</Text>
                        </View>
                    </View>

                    <View style={s.cardFooterRow}>
                        <View style={s.footerLeftGroup}>
                            <View style={s.footerMetaItem}>
                                <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
                                <Text style={s.footerMetaText}>{payDate}</Text>
                            </View>
                            <View style={s.footerMetaItem}>
                                <Ionicons name="cash-outline" size={13} color="#94A3B8" />
                                <Text style={s.footerMetaText}>{(item.payment_mode || 'Cash').toUpperCase()}</Text>
                            </View>
                        </View>
                        <View style={s.clearedBadge}>
                            <Ionicons name="checkmark-circle" size={12} color="#059669" />
                            <Text style={s.clearedBadgeText}>CLEARED</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" />

            {/* HEADER */}
            <LinearGradient colors={['#059669', '#10B981']} style={s.header}>
                <View style={s.navRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtnCircle}>
                        <Ionicons name="chevron-back" size={22} color="#059669" />
                    </TouchableOpacity>
                    <View style={s.headerTitleContainer}>
                        <Text style={s.screenTitleText}>Collected Payments</Text>
                        <Text style={s.screenSubtitleText}>{transactionsCount} payments</Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowExportModal(true)} style={s.exportBtn}>
                        <Download color="#FFF" size={20} />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* BODY */}
            <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
                {/* Retry button on error */}
                {!loading && error && (
                    <TouchableOpacity style={s.retryBtn} onPress={() => load()}>
                        <Text style={s.retryText}>Tap to Retry</Text>
                    </TouchableOpacity>
                )}

                {/* Total Collected Card */}
                {!loading && !error && (
                    <View style={s.totalCollectedCard}>
                        <View style={s.totalCollectedRow}>
                            <View style={s.totalCollectedIconBg}>
                                <Ionicons name="wallet-outline" size={22} color="#059669" />
                            </View>
                            <View style={s.totalCollectedTextContainer}>
                                <Text style={s.totalCollectedLabel}>Total Collected</Text>
                                <Text style={s.totalCollectedValue}>₹{total.toLocaleString('en-IN')}</Text>
                                <Text style={s.totalCollectedSub}>From {transactionsCount} payment{transactionsCount !== 1 ? 's' : ''}</Text>
                            </View>
                            <TouchableOpacity onPress={() => load(false)} style={s.refreshBtn} activeOpacity={0.7}>
                                <Ionicons name="refresh" size={18} color="#059669" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Search Bar */}
                <View style={s.searchBarContainer}>
                    <Ionicons name="search" size={18} color="#94A3B8" />
                    <TextInput
                        style={s.searchInput}
                        placeholder="Search by name, phone, or room..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#94A3B8"
                    />
                    <TouchableOpacity onPress={() => setDatePickerVisible(true)}>
                        <Ionicons name="calendar-outline" size={18} color="#059669" />
                    </TouchableOpacity>
                </View>

                {/* Monthly Collections Selector Row */}
                <View style={s.collectionsHeaderRow}>
                    <View>
                        <Text style={s.collectionsTitle}>Monthly Collections</Text>
                        <Text style={s.collectionsSubtitle}>Analytics & revenue overview</Text>
                    </View>
                </View>

                <View style={s.filterOptionsRow}>
                    <TouchableOpacity style={s.allFilterBtn} activeOpacity={0.8}>
                        <Ionicons name="grid-outline" size={18} color="#059669" />
                        <Text style={s.allFilterText}>All</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={s.monthDropdown} onPress={() => setDatePickerVisible(true)} activeOpacity={0.8}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.dropdownLabel}>Collection Month & Year</Text>
                            <Text style={s.dropdownValue}>{getMonthLabel(refDate)}</Text>
                        </View>
                        <Ionicons name="chevron-down" size={18} color="#1E293B" />
                    </TouchableOpacity>
                </View>

                {/* Transactions List */}
                {loading ? (
                    <ActivityIndicator size="large" color="#059669" style={{ marginTop: 30 }} />
                ) : filteredTransactions.length > 0 ? (
                    <View style={{ gap: 4 }}>
                        {filteredTransactions.map((item: any, idx: number) => renderTransactionCard(item, idx))}
                    </View>
                ) : (
                    <View style={s.emptyCard}>
                        <Text style={s.emptyIcon}>📭</Text>
                        <Text style={s.emptyTitle}>No Transactions</Text>
                        <Text style={s.emptyText}>No income matches your filter or search.</Text>
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Export Modal */}
            <Modal
                visible={showExportModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowExportModal(false)}
            >
                <View style={s.modalOverlay}>
                    <View style={s.modalContent}>
                        <View style={s.modalHeader}>
                            <Text style={s.modalTitle}>Export Income Report</Text>
                            <TouchableOpacity onPress={() => setShowExportModal(false)}>
                                <X size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <Text style={s.modalLabel}>Select Date Range</Text>
                        <Text style={s.modalSubLabel}>All transactions in this range will be exported</Text>

                        <View style={s.dateInputs}>
                            <TouchableOpacity style={s.dateInput} onPress={() => setStartDatePickerVisible(true)}>
                                <Ionicons name="calendar-outline" size={18} color="#64748B" />
                                <Text style={s.dateInputText}>
                                    {exportStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </Text>
                            </TouchableOpacity>
                            <Text style={{ color: '#94A3B8', fontWeight: '700' }}>→</Text>
                            <TouchableOpacity style={s.dateInput} onPress={() => setEndDatePickerVisible(true)}>
                                <Ionicons name="calendar-outline" size={18} color="#64748B" />
                                <Text style={s.dateInputText}>
                                    {exportEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {exportStart > exportEnd && (
                            <Text style={s.exportWarning}>⚠️ Start date must be before end date</Text>
                        )}

                        <TouchableOpacity
                            style={[
                                s.exportConfirmBtn,
                                (isExporting || exportStart > exportEnd) && s.exportConfirmBtnDisabled
                            ]}
                            onPress={handleExport}
                            disabled={isExporting || exportStart > exportEnd}
                        >
                            {isExporting ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <>
                                    <Text style={s.exportConfirmText}>Download Excel (All Data)</Text>
                                    <Download size={18} color="#FFF" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <DateTimePickerModal
                isVisible={isStartDatePickerVisible}
                mode="date"
                date={exportStart}
                maximumDate={new Date()}
                onConfirm={(date) => {
                    setExportStart(date);
                    setStartDatePickerVisible(false);
                }}
                onCancel={() => setStartDatePickerVisible(false)}
            />
            <DateTimePickerModal
                isVisible={isEndDatePickerVisible}
                mode="date"
                date={exportEnd}
                maximumDate={new Date()}
                onConfirm={(date) => {
                    setExportEnd(date);
                    setEndDatePickerVisible(false);
                }}
                onCancel={() => setEndDatePickerVisible(false)}
            />
            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                date={refDate}
                onConfirm={(date) => {
                    setRefDate(date);
                    setDatePickerVisible(false);
                }}
                onCancel={() => setDatePickerVisible(false)}
            />
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F8FAFC' },

    header: {
        paddingTop: 54,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backBtnCircle: {
        width: 38, height: 38,
        borderRadius: 19,
        backgroundColor: '#FFFFFF',
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        marginLeft: 12,
    },
    screenTitleText: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    screenSubtitleText: {
        fontSize: 11,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.8)',
        marginTop: 1,
    },
    exportBtn: {
        width: 38, height: 38,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 19,
    },

    body: { padding: 16 },

    retryBtn: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#059669',
    },
    retryText: { color: '#059669', fontWeight: '700', fontSize: 14 },

    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    cardTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 10,
    },

    totalCollectedCard: {
        backgroundColor: '#E6F7ED',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#BFEAD0',
    },
    totalCollectedRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    totalCollectedIconBg: {
        width: 44, height: 44,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 2,
    },
    totalCollectedTextContainer: {
        flex: 1,
    },
    totalCollectedLabel: {
        fontSize: 9,
        color: '#059669',
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    totalCollectedValue: {
        fontSize: 22,
        fontWeight: '900',
        color: '#059669',
        marginTop: 2,
    },
    totalCollectedSub: {
        fontSize: 11,
        color: '#059669',
        fontWeight: '600',
        marginTop: 1,
    },
    refreshBtn: {
        width: 36, height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        alignItems: 'center', justifyContent: 'center',
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },

    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 48,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 13,
        fontWeight: '600',
        color: '#0F172A',
    },

    collectionsHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 12,
        paddingHorizontal: 2,
    },
    collectionsTitle: {
        fontSize: 14,
        fontWeight: '950',
        color: '#1E293B',
    },
    collectionsSubtitle: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500',
        marginTop: 1,
    },
    filterOptionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    allFilterBtn: {
        width: 76,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 14,
    },
    allFilterText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#059669',
    },
    monthDropdown: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    dropdownLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#94A3B8',
        textTransform: 'uppercase',
    },
    dropdownValue: {
        fontSize: 12,
        fontWeight: '800',
        color: '#1E293B',
        marginTop: 1,
    },

    premiumCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        marginBottom: 12,
        flexDirection: 'row',
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    cardAccentLine: {
        width: 5,
    },
    cardInner: {
        flex: 1,
        padding: 14,
        gap: 12,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardAvatarBg: {
        width: 38, height: 38,
        borderRadius: 19,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 10,
    },
    cardNameBlock: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cardNameText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1E293B',
    },
    roomBadge: {
        backgroundColor: '#E6F7ED',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    roomBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#059669',
    },
    cardRightBlock: {
        alignItems: 'flex-end',
    },
    cardAmtText: {
        fontSize: 15,
        fontWeight: '950',
    },
    cardStatusSub: {
        fontSize: 9,
        color: '#94A3B8',
        fontWeight: '600',
        marginTop: 1,
    },
    columnsBlock: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    colItem: {
        flex: 1,
        alignItems: 'center',
    },
    colLabel: {
        fontSize: 8,
        color: '#94A3B8',
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    colValue: {
        fontSize: 12,
        fontWeight: '800',
        color: '#1E293B',
        marginTop: 2,
    },
    colDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#E2E8F0',
    },
    cardFooterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 10,
    },
    footerLeftGroup: {
        flexDirection: 'row',
        gap: 12,
    },
    footerMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    footerMetaText: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '700',
    },
    clearedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#E6F7ED',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 20,
    },
    clearedBadgeText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#059669',
    },

    emptyCard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 6 },
    emptyText: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 24 },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
    modalLabel: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 4 },
    modalSubLabel: { fontSize: 12, color: '#94A3B8', marginBottom: 14 },
    dateInputs: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    dateInput: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#F1F5F9', padding: 12, borderRadius: 12,
        borderWidth: 1, borderColor: '#E2E8F0',
    },
    dateInputText: { fontSize: 12, fontWeight: '600', color: '#1E293B', flexShrink: 1 },
    exportWarning: {
        fontSize: 12, color: '#EF4444',
        fontWeight: '600', marginBottom: 12,
    },
    exportConfirmBtn: {
        backgroundColor: '#059669',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 8,
        elevation: 2,
    },
    exportConfirmBtnDisabled: { backgroundColor: '#94A3B8' },
    exportConfirmText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
