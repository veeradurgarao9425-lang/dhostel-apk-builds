import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    FlatList, StatusBar, ActivityIndicator, Dimensions, Linking, Modal, Alert, TextInput, RefreshControl, Platform
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
import { toLocalDateStr as toLocalDateString } from '../utils/dateUtils';
import { AppHeader } from '../components/AppHeader';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SuccessModal } from '../components/SuccessModal';
import { downloadAndSaveFile } from '../utils/fileDownloader';
import { MonthFilter } from '../components/MonthFilter';
import { ModalSheet } from '../components/FormComponents';

const { width } = Dimensions.get('window');

export default function DownloadReceiptsScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { theme } = useTheme();

    const [refDate, setRefDate] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [transactions, setTransactions] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

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
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [downloadedFileUri, setDownloadedFileUri] = useState<string | null>(null);

    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => setDebouncedSearchQuery(searchQuery), 350);
        return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
    }, [searchQuery]);

    const load = useCallback(async (pageNum = 1, showIndicator = true) => {
        if (pageNum === 1) {
            if (showIndicator) setLoading(true);
            setError(null);
        } else {
            setLoadingMore(true);
        }
        try {
            const dateStr = toLocalDateString(refDate);
            const params: Record<string, any> = {
                type: 'month',
                date: dateStr,
                page: pageNum,
                limit: 10
            };
            if (debouncedSearchQuery) {
                params.search = debouncedSearchQuery;
            }
            const res = await api.get('/income/analytics', {
                params,
                timeout: 15000,
            });

            if (res.data?.success) {
                const analyticsData = res.data.data ?? null;
                setData(analyticsData);
                const newTransactions = analyticsData?.transactions ?? [];
                setHasMore(analyticsData?.hasMore ?? (newTransactions.length === 10));

                setTransactions(prev => {
                    if (pageNum === 1) return newTransactions;
                    const existingIds = new Set(prev.map(t => t.id));
                    const unique = newTransactions.filter((t: any) => !existingIds.has(t.id));
                    return [...prev, ...unique];
                });
            } else {
                if (pageNum === 1) {
                    setData(null);
                    setTransactions([]);
                }
                setError(res.data?.message || 'No data returned from server.');
            }
        } catch (e: any) {
            console.log(e);
            if (pageNum === 1) {
                setData(null);
                setTransactions([]);
                if (e?.code === 'ECONNABORTED') {
                    setError('Request timed out. Check your connection.');
                } else {
                    setError('Failed to load data. Tap to retry.');
                }
            }
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [refDate, debouncedSearchQuery]);

    useEffect(() => {
        setPage(1);
        setHasMore(true);
        load(1, true);
    }, [load]);

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

            const baseURL = (api.defaults.baseURL || 'http://143.244.131.69:8081/api').replace(/\/$/, '');
            const exportUrl = `${baseURL}/income/export?startDate=${startStr}&endDate=${endStr}&token=${encodeURIComponent(token)}&all=true`;

            const filename = `receipts_report_${startStr}_to_${endStr}.xlsx`;
            const fileUri = `${FileSystem.documentDirectory}${filename}`;

            const downloadResult = await FileSystem.downloadAsync(exportUrl, fileUri);

            setShowExportModal(false);

            if (downloadResult.status === 200) {
                // Share directly — file is already saved to app storage
                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                    await Sharing.shareAsync(downloadResult.uri, {
                        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        dialogTitle: `Open ${filename}`,
                        UTI: 'com.microsoft.excel.xlsx',
                    });
                } else {
                    Alert.alert('Downloaded', `File saved as:\n${filename}`);
                }
            } else {
                Alert.alert('Error', `Server returned status code ${downloadResult.status}`);
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to export data');
        } finally {
            setIsExporting(false);
        }
    };

    const total = data?.total_amount ?? 0;
    const transactionsCount = data?.total_count ?? 0;

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
                        const feeData = {
                            fee_id: item.id?.replace('fee_', '').replace('inc_', '') || 'N/A',
                            first_name: item.title?.split(' ')[0] || 'Student',
                            last_name: item.title?.split(' ').slice(1).join(' ') || '',
                            room_number: item.room_number || 'N/A',
                            paid_amount: item.amount || 0,
                            phone: item.phone || 'N/A',
                            fee_month: item.date ? new Date(item.date).toLocaleString('default', { month: 'long', year: 'numeric' }) : 'N/A',
                            due_date: item.date || 'N/A'
                        };
                        navigation.navigate('Receipt', { feeData });
                    }
                }}
                activeOpacity={0.9}
            >
                <View style={[s.cardAccentLine, { backgroundColor: isRent ? '#3B82F6' : '#8B5CF6' }]} />

                <View style={s.cardInner}>
                    <View style={s.cardHeaderRow}>
                        <View style={[s.cardAvatarBg, { backgroundColor: isRent ? '#EFF6FF' : '#F5F3FF' }]}>
                            <Ionicons name="document-text-outline" size={18} color={isRent ? "#2563EB" : "#7C3AED"} />
                        </View>
                        <View style={s.cardNameBlock}>
                            <Text style={s.cardNameText}>{item.title}</Text>
                            {isRent && item.room_number && (
                                <View style={[s.roomBadge, { backgroundColor: '#EFF6FF' }]}>
                                    <Text style={[s.roomBadgeText, { color: '#2563EB' }]}>Room {item.room_number}</Text>
                                </View>
                            )}
                        </View>
                        <View style={s.cardRightBlock}>
                            <Text style={[s.cardAmtText, { color: isRent ? '#2563EB' : '#7C3AED' }]}>
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
                            <Text style={[s.colLabel, { color: '#2563EB' }]}>Paid</Text>
                            <Text style={[s.colValue, { color: '#2563EB' }]}>₹{item.amount.toLocaleString('en-IN')}</Text>
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
                        <View style={[s.clearedBadge, { backgroundColor: '#DBEAFE' }]}>
                            <Ionicons name="download-outline" size={12} color="#2563EB" />
                            <Text style={[s.clearedBadgeText, { color: '#2563EB', fontWeight: '900' }]}>GET RECEIPT</Text>
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
            <AppHeader
                title="Download Receipts"
                subtitle="Select payment to get receipt"
                rightComponent={
                    <TouchableOpacity onPress={() => setShowExportModal(true)} style={s.exportBtn}>
                        <Download color="#FFF" size={20} />
                    </TouchableOpacity>
                }
            >
                <View style={{ marginTop: 12 }}>
                    <MonthFilter value={refDate} onChange={setRefDate} />
                </View>
            </AppHeader>

            {/* BODY */}
            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
                </View>
            ) : (
                <FlatList
                    style={{ flex: 1 }}
                    data={transactions}
                    keyExtractor={(item, index) => item.id || index.toString()}
                    renderItem={({ item, index }) => renderTransactionCard(item, index)}
                    contentContainerStyle={s.listContentContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={async () => {
                                setRefreshing(true);
                                setPage(1);
                                setHasMore(true);
                                await load(1, false);
                                setRefreshing(false);
                            }}
                            tintColor="#2563EB"
                        />
                    }
                    onEndReached={() => {
                        if (loadingMore || !hasMore) return;
                        setPage(prev => {
                            const next = prev + 1;
                            load(next, false);
                            return next;
                        });
                    }}
                    onEndReachedThreshold={0.4}
                    ListHeaderComponent={
                        <View style={{ gap: 16, marginBottom: 16 }}>
                            {/* Retry button on error */}
                            {error && (
                                <TouchableOpacity style={s.retryBtn} onPress={() => load(1, true)}>
                                    <Text style={s.retryText}>Tap to Retry</Text>
                                </TouchableOpacity>
                            )}

                            {/* Search Bar */}
                            <View style={s.searchBarContainer}>
                                <Ionicons name="search" size={18} color="#94A3B8" />
                                <TextInput
                                    style={s.searchInput}
                                    placeholder="Search student to get receipt..."
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>

                            {/* Monthly Collections Selector Row */}
                            <View style={s.collectionsHeaderRow}>
                                <View>
                                    <Text style={s.collectionsTitle}>Select Payment Receipt</Text>
                                    <Text style={s.collectionsSubtitle}>Tap card to download receipt PDF</Text>
                                </View>
                            </View>
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={s.emptyCard}>
                            <Text style={s.emptyIcon}>📭</Text>
                            <Text style={s.emptyTitle}>No Transactions</Text>
                            <Text style={s.emptyText}>No income matches your filter or search.</Text>
                        </View>
                    }
                    ListFooterComponent={
                        loadingMore ? (
                            <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 20 }} />
                        ) : !hasMore && transactions.length > 0 ? (
                            <View style={{ alignItems: 'center', marginVertical: 20 }}>
                                <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '600' }}>All payments loaded</Text>
                            </View>
                        ) : null
                    }
                />
            )}

            {/* Export Modal */}
            {/* Export Modal */}
            <ModalSheet
                visible={showExportModal}
                onClose={() => setShowExportModal(false)}
            >
                <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
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
            </ModalSheet>

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

    exportBtn: {
        width: 38, height: 38,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 19,
    },

    retryBtn: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#2563EB',
    },
    retryText: { color: '#2563EB', fontWeight: '700', fontSize: 14 },

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
        fontWeight: '900',
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
        color: '#2563EB',
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
        color: '#2563EB',
    },
    cardRightBlock: {
        alignItems: 'flex-end',
    },
    cardAmtText: {
        fontSize: 15,
        fontWeight: '900',
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
        color: '#2563EB',
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
        backgroundColor: '#2563EB',
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
    listContentContainer: {
        padding: 16,
        paddingBottom: 120,
    },
});
