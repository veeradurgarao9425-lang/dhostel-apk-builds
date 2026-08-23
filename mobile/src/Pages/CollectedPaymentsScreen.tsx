import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    FlatList, StatusBar, Dimensions, Linking, Modal, TextInput, RefreshControl,
    ActivityIndicator, ScrollView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Download, X } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../context/ToastContext';
import { FullScreenLoader } from '../components/FullScreenLoader';
import { useRefresh } from '../../contexts/RefreshContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toLocalDateStr as toLocalDateString } from '../utils/dateUtils';
import { AppHeader } from '../components/AppHeader';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { downloadAndSaveFile } from '../utils/fileDownloader';
import { SkeletonList } from '../components/ui/SkeletonCard';
import { LoadMoreFooter } from '../components/ui/LoadMoreFooter';
import { CustomDateRangePicker } from '../components/ui/pickers/CustomDateRangePicker';
import { CustomMonthYearPicker } from '../components/ui/pickers/CustomMonthYearPicker';
import { ModalSheet } from '../components/FormComponents';

const { width } = Dimensions.get('window');

// toLocalDateString is now imported from utils/dateUtils as an alias.


export default function CollectedPaymentsScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { theme, isDark } = useTheme();
    const { showError, showSuccess, showApiError } = useToast();
    const { refreshCounter } = useRefresh();

    // -- Filter State --
    const [filterMode, setFilterMode] = useState<'month' | 'custom'>('month');
    const [statsMonth, setStatsMonth] = useState(new Date());
    const [customStart, setCustomStart] = useState(() => { const d = new Date(); d.setDate(1); return d; });
    const [customEnd, setCustomEnd] = useState(new Date());

    const [filterSelectModal, setFilterSelectModal] = useState(false);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [showCustomPicker, setShowCustomPicker] = useState(false);

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

    // Single Date Filter
    const [singleDateFilter, setSingleDateFilter] = useState<Date | null>(null);
    const [showSingleDatePicker, setShowSingleDatePicker] = useState(false);

    // Derived min/max date bounds for the date picker (based on statsMonth)
    const minDateBound = filterMode === 'month' ? new Date(statsMonth.getFullYear(), statsMonth.getMonth(), 1) : customStart;
    let maxDateBound = filterMode === 'month' ? new Date(statsMonth.getFullYear(), statsMonth.getMonth() + 1, 0) : customEnd;
    
    // Restrict future dates
    const today = new Date();
    if (maxDateBound > today) {
        maxDateBound = today;
    }

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
            const params: Record<string, any> = {
                page: pageNum,
                limit: 10
            };

            if (singleDateFilter) {
                params.type = 'custom';
                params.startDate = toLocalDateString(singleDateFilter);
                params.endDate = toLocalDateString(singleDateFilter);
            } else if (filterMode === 'month') {
                params.type = 'month';
                params.date = toLocalDateString(statsMonth);
            } else {
                params.startDate = toLocalDateString(customStart);
                params.endDate = toLocalDateString(customEnd);
            }

            if (debouncedSearchQuery) {
                params.search = debouncedSearchQuery;
            }
            const res = await api.get('/income/analytics', {
                params,
                timeout: 30000,  // 30s for cold-start Render servers
            });

            if (res.data?.success) {
                const analyticsData = res.data.data ?? null;
                setData(analyticsData);
                const newTransactions = analyticsData?.transactions ?? [];
                setHasMore(analyticsData?.hasMore ?? (newTransactions.length === 20));

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
                    setError('Server is waking up. Please wait a moment and tap to retry.');
                } else {
                    setError('Failed to load data. Tap to retry.');
                }
            }
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [filterMode, statsMonth, customStart, customEnd, debouncedSearchQuery, singleDateFilter]);

    useEffect(() => {
        setPage(1);
        setHasMore(true);
        load(1, false);
    }, [load, refreshCounter]);

    let periodLabel = '';
    if (filterMode === 'month') {
        periodLabel = statsMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    } else {
        periodLabel = `${customStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${customEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }

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
            showError('Start date must be before end date.');
            return;
        }

        setIsExporting(true);
        try {
            const startStr = toLocalDateString(exportStart);
            const endStr = toLocalDateString(exportEnd);
            const token = await AsyncStorage.getItem('token');

            if (!token) {
                showError('Authentication token not found. Please log in again.');
                return;
            }

            const baseURL = (api.defaults.baseURL || 'https://api.143-244-131-69.sslip.io/api').replace(/\/$/, '');
            const exportUrl = `${baseURL}/reports/download/excel?startDate=${startStr}&endDate=${endStr}&reportType=collection&token=${encodeURIComponent(token)}`;

            const filename = `Collected_Rent_Report_${startStr}_to_${endStr}.xlsx`;

            setShowExportModal(false);
            await downloadAndSaveFile(exportUrl, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        } catch (error) {
            console.error(error);
            showApiError(error, 'Failed to export data');
        } finally {
            setIsExporting(false);
        }
    };

    const total = data?.total_amount ?? 0;
    const transactionsCount = data?.total_count ?? 0;

    const filteredTransactions = transactions;

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
        const isGuest = item.type === 'Guest';
        const isAdmission = item.type === 'Admission';
        
        let accentColor = '#F59E0B'; // Amber for Other
        let textColor = '#D97706';
        let bgAvatar = '#FEF3C7';
        let iconName = 'wallet';

        if (isRent) {
            accentColor = '#10B981';
            textColor = '#059669';
            bgAvatar = '#E2FBE9';
            iconName = 'person';
        } else if (isGuest) {
            accentColor = '#6366F1';
            textColor = '#4338CA';
            bgAvatar = '#E0E7FF';
            iconName = 'people';
        } else if (isAdmission) {
            accentColor = '#8B5CF6'; // Purple for Admission
            textColor = '#6D28D9';
            bgAvatar = '#F5F3FF';
            iconName = 'school';
        }

        return (
            <TouchableOpacity
                key={item.id ?? idx}
                style={[s.premiumCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
                onPress={() => {
                    if (item.student_id) {
                        navigation.navigate('TenantTransactions', { studentId: item.student_id, studentName: item.title });
                    }
                }}
                activeOpacity={0.9}
            >
                <View style={[s.cardAccentLine, { backgroundColor: accentColor }]} />

                <View style={s.cardInner}>
                    <View style={s.cardHeaderRow}>
                        <View style={[s.cardAvatarBg, { backgroundColor: bgAvatar }]}>
                            <Ionicons name={iconName as any} size={18} color={textColor} />
                        </View>
                        <View style={s.cardNameBlock}>
                            <Text style={[s.cardNameText, { color: isDark ? '#F8FAFC' : '#1E293B' }]} numberOfLines={1}>{item.title}</Text>
                            {(isRent && item.room_number) ? (
                                <View style={[s.roomBadge, { backgroundColor: bgAvatar }]}>
                                    <Text style={[s.roomBadgeText, { color: textColor }]}>Room {item.room_number}</Text>
                                </View>
                            ) : null}
                            {isGuest && (
                                <View style={[s.roomBadge, { backgroundColor: bgAvatar }]}>
                                    <Text style={[s.roomBadgeText, { color: textColor }]}>Guest</Text>
                                </View>
                            )}
                            {isAdmission && (
                                <View style={[s.roomBadge, { backgroundColor: bgAvatar }]}>
                                    <Text style={[s.roomBadgeText, { color: textColor }]}>Admission Fee</Text>
                                </View>
                            )}
                        </View>
                        <View style={s.cardRightBlock}>
                            <Text style={[s.cardAmtText, { color: textColor }]}>
                                ₹{item.amount.toLocaleString('en-IN')}
                            </Text>
                            <Text style={[s.cardStatusSub, { color: textColor }]}>PAID</Text>
                        </View>
                    </View>

                    <View style={[s.columnsBlock, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                        <View style={s.colItem}>
                            <Text style={s.colLabel}>Total</Text>
                            <Text style={[s.colValue, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>₹{(item.total_due ?? item.amount).toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={[s.colDivider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
                        <View style={s.colItem}>
                            <Text style={[s.colLabel, { color: textColor }]}>Paid</Text>
                            <Text style={[s.colValue, { color: textColor }]}>₹{item.amount.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={[s.colDivider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
                        <View style={s.colItem}>
                            <Text style={[s.colLabel, { color: '#DC2626' }]}>Pending</Text>
                            <Text style={[s.colValue, { color: '#DC2626' }]}>₹{(item.balance ?? 0).toLocaleString('en-IN')}</Text>
                        </View>
                    </View>

                    <View style={[s.cardFooterRow, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
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
                        {isRent ? (
                            <View style={[s.clearedBadge, { backgroundColor: '#CCFBF1' }]}>
                                <Ionicons name="chevron-forward-circle" size={12} color="#0D9488" />
                                <Text style={[s.clearedBadgeText, { color: '#0D9488', fontWeight: '900' }]}>VIEW HISTORY</Text>
                            </View>
                        ) : null}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[s.root, { backgroundColor: theme.background }]}>
            <FullScreenLoader visible={isExporting} />
            <StatusBar barStyle="light-content" />

            {/* HEADER */}
            <AppHeader
                title="Collected Rent"
                subtitle="All history payments"
                alignLeft={true}
                rightComponent={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <TouchableOpacity style={s.topFilterBtn} onPress={() => setShowMonthPicker(true)} activeOpacity={0.8}>
                            <Ionicons name="calendar-outline" size={14} color="#FFF" />
                            <Text style={s.topFilterTxt}>{periodLabel}</Text>
                            <Ionicons name="chevron-down" size={12} color="#FFF" />
                        </TouchableOpacity>
                        
                        <TouchableOpacity onPress={() => setShowExportModal(true)} style={s.exportBtn} activeOpacity={0.75}>
                            <Download color="#FFF" size={18} />
                        </TouchableOpacity>
                    </View>
                }
            />

            {/* BODY */}
            {loading ? (
                <SkeletonList count={6} />
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
                            tintColor="#059669"
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
                        <View style={{ gap: 8, marginBottom: 8 }}>
                            {/* Retry button on error */}
                            {error && (
                                <TouchableOpacity style={[s.retryBtn, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]} onPress={() => load(1, true)} activeOpacity={0.75}>
                                    <Text style={s.retryText}>Tap to Retry</Text>
                                </TouchableOpacity>
                            )}

                            {/* Total Collected Card */}
                            {!error && (
                                <View style={[s.totalCollectedCard, { backgroundColor: isDark ? '#0F2E22' : '#E6F7ED', borderColor: isDark ? '#134E38' : '#BFEAD0' }]}>
                                    <View style={s.totalCollectedRow}>
                                        <View style={[s.totalCollectedIconBg, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                                            <Ionicons name="wallet-outline" size={22} color="#059669" />
                                        </View>
                                        <View style={s.totalCollectedTextContainer}>
                                            <Text style={s.totalCollectedLabel}>Total Collected • {periodLabel}</Text>
                                            <Text style={s.totalCollectedValue}>₹{total.toLocaleString('en-IN')}</Text>
                                            <Text style={s.totalCollectedSub}>From {transactionsCount} payment{transactionsCount !== 1 ? 's' : ''}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => load(1, true)} style={[s.refreshBtn, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]} activeOpacity={0.7}>
                                            <Ionicons name="refresh" size={18} color="#059669" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {/* Search Bar & Single Date Row */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: singleDateFilter ? 4 : 8 }}>
                                <View style={[s.searchBarContainer, { flex: 1, marginBottom: 0, backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                                    <Ionicons name="search" size={18} color="#94A3B8" />
                                    <TextInput
                                        style={[s.searchInput, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
                                        placeholder="Search by name, phone, or room..."
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        placeholderTextColor="#94A3B8"
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[s.singleDateBtn, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
                                    onPress={() => setShowSingleDatePicker(true)}
                                    activeOpacity={0.75}
                                >
                                    <Ionicons name="calendar" size={18} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            {/* Active Single Date Filter Chip */}
                            {singleDateFilter && (
                                <View style={s.activeFilterChipContainer}>
                                    <View style={s.activeFilterChip}>
                                        <Text style={s.activeFilterChipText}>
                                            {singleDateFilter.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => setSingleDateFilter(null)}
                                            style={s.activeFilterChipClose}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            activeOpacity={0.7}
                                        >
                                            <X size={12} color="#059669" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {/* Showing X out of Y text */}
                            {transactionsCount > 0 && !error && (
                                <View style={{ paddingHorizontal: 4, paddingBottom: 4 }}>
                                    <Text style={{ fontSize: 12, color: theme.textSecondary, fontWeight: '600' }}>
                                        Showing {transactions.length} of {transactionsCount} payments
                                    </Text>
                                </View>
                            )}
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={[s.emptyCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                            <Text style={s.emptyIcon}>📭</Text>
                            <Text style={[s.emptyTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>No Transactions</Text>
                            <Text style={s.emptyText}>No income matches your filter or search.</Text>
                        </View>
                    }
                    ListFooterComponent={
                        loadingMore ? (
                            <ActivityIndicator size="small" color="#059669" style={{ marginVertical: 20 }} />
                        ) : !hasMore && transactions.length > 0 ? (
                            <View style={{ alignItems: 'center', marginVertical: 20 }}>
                                <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '600' }}>All payments loaded</Text>
                            </View>
                        ) : null
                    }
                />
            )}

            {/* Export Modal (Bottom Sheet Drawer) */}
            <ModalSheet
                visible={showExportModal}
                onClose={() => setShowExportModal(false)}
                maxHeight="75%"
            >
                <View style={s.bottomSheetHeader}>
                    <Text style={[s.bottomSheetTitle, { color: theme.textPrimary }]}>Export Income Report</Text>
                    <TouchableOpacity onPress={() => setShowExportModal(false)}>
                        <Text style={{ color: theme.primary, fontSize: 15, fontWeight: '700' }}>Close</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
                    <Text style={[s.modalLabel, { color: theme.textSecondary }]}>Select Date Range</Text>
                    <Text style={[s.modalSubLabel, { color: '#94A3B8' }]}>All transactions in this range will be exported</Text>

                    <View style={s.dateInputs}>
                        <TouchableOpacity style={[s.dateInput, { backgroundColor: isDark ? '#334155' : '#F1F5F9', borderColor: isDark ? '#475569' : '#E2E8F0' }]} onPress={() => setStartDatePickerVisible(true)} activeOpacity={0.75}>
                            <Ionicons name="calendar-outline" size={18} color="#64748B" />
                            <Text style={[s.dateInputText, { color: theme.textPrimary }]}>
                                {exportStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[s.dateInput, { backgroundColor: isDark ? '#334155' : '#F1F5F9', borderColor: isDark ? '#475569' : '#E2E8F0' }]} onPress={() => setEndDatePickerVisible(true)} activeOpacity={0.75}>
                            <Ionicons name="calendar-outline" size={18} color="#64748B" />
                            <Text style={[s.dateInputText, { color: theme.textPrimary }]}>
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
                            { backgroundColor: (isExporting || exportStart > exportEnd) ? '#94A3B8' : theme.primary }
                        ]}
                        onPress={handleExport}
                        disabled={isExporting || exportStart > exportEnd}
                        activeOpacity={0.8}
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
                </ScrollView>
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
                isVisible={showSingleDatePicker}
                mode="date"
                date={singleDateFilter || new Date()}
                minimumDate={minDateBound}
                maximumDate={maxDateBound}
                onConfirm={(date) => {
                    setSingleDateFilter(date);
                    setShowSingleDatePicker(false);
                }}
                onCancel={() => setShowSingleDatePicker(false)}
            />
            
            <CustomMonthYearPicker
                visible={showMonthPicker}
                onClose={() => setShowMonthPicker(false)}
                onConfirm={(d: Date) => {
                    setFilterMode('month');
                    setStatsMonth(d);
                    setSingleDateFilter(null);
                    setShowMonthPicker(false);
                }}
                initialDate={statsMonth}
            />

            <CustomDateRangePicker
                visible={showCustomPicker}
                onClose={() => setShowCustomPicker(false)}
                onConfirm={(st: Date, ed: Date) => { setFilterMode('custom'); setCustomStart(st); setCustomEnd(ed); setSingleDateFilter(null); setShowCustomPicker(false); }}
                initialStart={customStart}
                initialEnd={customEnd}
            />
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F8FAFC' },
    topFilterBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 10, paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    topFilterTxt: { color: '#FFF', fontSize: 12, fontWeight: '700' },
    dropdownMenu: {
        position: 'absolute', top: 90, right: 16,
        borderRadius: 16, padding: 8, width: 220,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
    },
    filterOpt: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6 },
    fTitle: { fontSize: 13, fontWeight: '700' },
    fSub: { fontSize: 10, color: '#64748B', marginTop: 2, fontWeight: '600' },

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
    singleDateBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        flexDirection: 'row',
    },
    activeFilterChipContainer: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    activeFilterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    activeFilterChipText: {
        color: '#065F46',
        fontSize: 11,
        fontWeight: '700',
        marginRight: 6,
    },
    activeFilterChipClose: {
        backgroundColor: 'rgba(5, 150, 105, 0.1)',
        padding: 3,
        borderRadius: 10,
    },

    monthNavBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#E6F7ED',
        borderRadius: 14,
        paddingHorizontal: 8,
        paddingVertical: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#BFEAD0',
    },
    monthNavArrow: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 3,
    },
    monthNavLabel: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 4,
    },
    monthNavLabelText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#059669',
        letterSpacing: 0.2,
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
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: 4,
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
        fontSize: 19,
        fontWeight: '900',
    },
    cardStatusSub: {
        fontSize: 10,
        fontWeight: '800',
        marginTop: 2,
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
        backgroundColor: 'transparent',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: { 
        backgroundColor: '#FFF', 
        borderRadius: 24, 
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 16,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.15)',
    },
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
    listContentContainer: {
        padding: 16,
        paddingBottom: 120,
    },
    bottomSheetContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '75%',
        paddingBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 12,
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.15)',
    },
    bottomSheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    bottomSheetTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#000000',
    },
});
