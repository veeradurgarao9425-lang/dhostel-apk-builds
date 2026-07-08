import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { ModalSheet } from '../../components/FormComponents';

interface CollectionDetailsSheetProps {
    data: {
        collectionStats: {
            totalExpected: number;
            collected: number;
            monthName: string;
            pending: number;
            tenantsCount: number;
            overdueCount: number;
            overdueAmount: number;
            dueTodayCount: number;
            dueThisWeekCount: number;
            paidCount: number;
        };
        unpaidStudents: any[];
        upcomingDues: any[];
    };
    showCollectionSheet: boolean;
    setShowCollectionSheet: (show: boolean) => void;
}

const avatarLetter = (name: string) => (name || 'T')[0].toUpperCase();

export const CollectionDetailsSheet = ({ data, showCollectionSheet, setShowCollectionSheet }: CollectionDetailsSheetProps) => {
    const navigation = useNavigation<any>();
    const { theme, isDark } = useTheme();
    const { t } = useTranslation();

    const pct = data.collectionStats.totalExpected > 0
        ? Math.round((data.collectionStats.collected / data.collectionStats.totalExpected) * 100)
        : 0;

    return (
        <ModalSheet visible={showCollectionSheet} onClose={() => setShowCollectionSheet(false)} maxHeight="88%">
            <View style={s.sheetHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="cash-outline" size={18} color={theme.primary} />
                    <Text style={[s.sheetTitleText, { color: theme.textPrimary }]}>
                        {data.collectionStats.monthName} Collection Status
                    </Text>
                </View>
                <TouchableOpacity onPress={() => setShowCollectionSheet(false)} style={s.sheetCloseBtn}>
                    <Ionicons name="close" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>

                {/* ── Hero: percentage + collected/pending ── */}
                <View style={[s.sheetHero, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                    <View style={s.sheetHeroCircle}>
                        <Text style={{ fontSize: 20, fontWeight: '900', color: theme.primary }}>{pct}%</Text>
                        <Text style={{ fontSize: 9, fontWeight: '600', color: theme.textSecondary }}>collected</Text>
                    </View>
                    <View style={{ flex: 1, gap: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '700' }}>COLLECTED</Text>
                            <Text style={{ color: '#10B981', fontSize: 15, fontWeight: '800' }}>₹{data.collectionStats.collected.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700' }}>PENDING</Text>
                            <Text style={{ color: '#EF4444', fontSize: 15, fontWeight: '800' }}>₹{data.collectionStats.pending.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={[s.sheetHeroDivider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '700' }}>TARGET · {data.collectionStats.tenantsCount} TENANTS</Text>
                            <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '800' }}>₹{data.collectionStats.totalExpected.toLocaleString('en-IN')}</Text>
                        </View>
                    </View>
                </View>

                <View style={[s.progressBarBackground, { height: 8, backgroundColor: isDark ? '#334155' : '#E2E8F0', marginTop: 14, marginBottom: 16 }]}>
                    <View style={[s.progressBarFill, { width: `${pct}%`, backgroundColor: '#10B981' }]} />
                </View>

                {/* ── Breakdown grid ── */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    <TouchableOpacity
                        style={s.sheetTile}
                        activeOpacity={0.7}
                        onPress={() => { setShowCollectionSheet(false); navigation.navigate('PendingTab'); }}
                    >
                        <Ionicons name="alert-circle" size={16} color="#EF4444" />
                        <Text style={s.sheetTileLabel}>Overdue</Text>
                        <Text style={[s.sheetTileValue, { color: '#991B1B' }]}>{data.collectionStats.overdueCount}</Text>
                        <Text style={s.sheetTileSub}>₹{(data.collectionStats.overdueAmount || 0).toLocaleString('en-IN')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[s.sheetTile, { backgroundColor: '#FFFBEB', borderLeftColor: '#F59E0B' }]}
                        activeOpacity={0.7}
                        onPress={() => { setShowCollectionSheet(false); navigation.navigate('PendingTab', { tab: 'Next 7 Days' }); }}
                    >
                        <Ionicons name="time" size={16} color="#F59E0B" />
                        <Text style={[s.sheetTileLabel, { color: '#B45309' }]}>Due Today</Text>
                        <Text style={[s.sheetTileValue, { color: '#B45309' }]}>{data.collectionStats.dueTodayCount}</Text>
                    </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
                    <TouchableOpacity
                        style={[s.sheetTile, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderLeftColor: '#64748B' }]}
                        activeOpacity={0.7}
                        onPress={() => { setShowCollectionSheet(false); navigation.navigate('PendingTab', { tab: 'Next 7 Days' }); }}
                    >
                        <Ionicons name="calendar" size={16} color={isDark ? '#94A3B8' : '#475569'} />
                        <Text style={[s.sheetTileLabel, { color: isDark ? '#94A3B8' : '#475569' }]}>Due This Wk</Text>
                        <Text style={[s.sheetTileValue, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>{data.collectionStats.dueThisWeekCount}</Text>
                    </TouchableOpacity>
                    <View style={[s.sheetTile, { backgroundColor: '#ECFDF5', borderLeftColor: '#10B981' }]}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={[s.sheetTileLabel, { color: '#065F46' }]}>Paid</Text>
                        <Text style={[s.sheetTileValue, { color: '#065F46' }]}>{data.collectionStats.paidCount}</Text>
                    </View>
                </View>

                {/* ── Preview: top overdue tenants ── */}
                {data.unpaidStudents && data.unpaidStudents.length > 0 && (
                    <View style={{ marginBottom: 14 }}>
                        <View style={s.sheetSectionHeaderRow}>
                            <Text style={[s.sheetSectionLabel, { color: theme.textPrimary, marginBottom: 0 }]}>Overdue Tenants</Text>
                            <TouchableOpacity onPress={() => { setShowCollectionSheet(false); navigation.navigate('PendingTab'); }}>
                                <Text style={s.seeAll}>{t('dashboard.viewAll')}</Text>
                            </TouchableOpacity>
                        </View>
                        {data.unpaidStudents.slice(0, 3).map((item, idx) => (
                            <View key={idx} style={[s.sheetRow, { borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                <TouchableOpacity
                                    style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}
                                    activeOpacity={0.7}
                                    onPress={() => { setShowCollectionSheet(false); navigation.navigate('StudentDetails', { studentId: item.id }); }}
                                >
                                    <View style={[s.sheetRowAvatar, { backgroundColor: '#FEE2E2' }]}>
                                        <Text style={{ color: '#DC2626', fontSize: 11, fontWeight: '800' }}>{avatarLetter(item.name)}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: theme.textPrimary, fontSize: 12.5, fontWeight: '700' }} numberOfLines={1}>{item.name}</Text>
                                        <Text style={{ color: theme.textSecondary, fontSize: 10, fontWeight: '600' }} numberOfLines={1}>
                                            {item.room_number ? `Room ${item.room_number} · ` : ''}{item.daysLate}d late
                                        </Text>
                                    </View>
                                    <Text style={{ color: '#DC2626', fontSize: 13, fontWeight: '800' }}>₹{Number(item.amount).toLocaleString('en-IN')}</Text>
                                </TouchableOpacity>
                                {!!item.phone && (
                                    <TouchableOpacity style={s.rowCallBtn} activeOpacity={0.7} onPress={() => Linking.openURL(`tel:${item.phone}`)}>
                                        <Ionicons name="call" size={14} color="#16A34A" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* ── Preview: dues in next 3 days ── */}
                {data.upcomingDues && data.upcomingDues.length > 0 && (
                    <View style={{ marginBottom: 8 }}>
                        <View style={s.sheetSectionHeaderRow}>
                            <Text style={[s.sheetSectionLabel, { color: theme.textPrimary, marginBottom: 0 }]}>Dues in Next 7 Days</Text>
                            <TouchableOpacity onPress={() => { setShowCollectionSheet(false); navigation.navigate('PendingTab', { tab: 'Next 7 Days' }); }}>
                                <Text style={s.seeAll}>{t('dashboard.viewAll')}</Text>
                            </TouchableOpacity>
                        </View>
                        {data.upcomingDues.slice(0, 3).map((item, idx) => (
                            <View key={idx} style={[s.sheetRow, { borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                                <TouchableOpacity
                                    style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}
                                    activeOpacity={0.7}
                                    onPress={() => { setShowCollectionSheet(false); navigation.navigate('StudentDetails', { studentId: item.id }); }}
                                >
                                    <View style={[s.sheetRowAvatar, { backgroundColor: '#FEF3C7' }]}>
                                        <Text style={{ color: '#D97706', fontSize: 11, fontWeight: '800' }}>{avatarLetter(item.name)}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: theme.textPrimary, fontSize: 12.5, fontWeight: '700' }} numberOfLines={1}>{item.name}</Text>
                                        <Text style={{ color: theme.textSecondary, fontSize: 10, fontWeight: '600' }} numberOfLines={1}>
                                            {item.room_number ? `Room ${item.room_number} · ` : ''}{item.daysLeft === 0 ? 'Due today' : `Due in ${item.daysLeft}d`}
                                        </Text>
                                    </View>
                                    <Text style={{ color: '#D97706', fontSize: 13, fontWeight: '800' }}>₹{Number(item.amount).toLocaleString('en-IN')}</Text>
                                </TouchableOpacity>
                                {!!item.phone && (
                                    <TouchableOpacity style={s.rowCallBtn} activeOpacity={0.7} onPress={() => Linking.openURL(`tel:${item.phone}`)}>
                                        <Ionicons name="call" size={14} color="#16A34A" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* ── Actions ── */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <TouchableOpacity
                        style={[s.sheetActionBtn, { backgroundColor: theme.primary }]}
                        activeOpacity={0.85}
                        onPress={() => { setShowCollectionSheet(false); navigation.navigate('PendingTab'); }}
                    >
                        <Ionicons name="list" size={15} color="#FFF" />
                        <Text style={s.sheetActionBtnText}>View All Pending</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[s.sheetActionBtn, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}
                        activeOpacity={0.85}
                        onPress={() => { setShowCollectionSheet(false); navigation.navigate('BillReminders'); }}
                    >
                        <Ionicons name="notifications" size={15} color={theme.primary} />
                        <Text style={[s.sheetActionBtnText, { color: theme.primary }]}>Send Reminders</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </ModalSheet>
    );
};

const s = StyleSheet.create({
    sheetHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    sheetTitleText: {
        fontSize: 18,
        fontWeight: '800',
    },
    sheetCloseBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(148,163,184,0.15)',
    },
    sheetHero: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderRadius: 16,
        padding: 14,
    },
    sheetHeroCircle: {
        width: 66,
        height: 66,
        borderRadius: 33,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(124,58,237,0.1)',
    },
    sheetHeroDivider: {
        height: 1,
        marginVertical: 2,
    },
    sheetTile: {
        flex: 1,
        backgroundColor: '#FEF2F2',
        padding: 10,
        borderRadius: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#EF4444',
        gap: 2,
    },
    sheetTileLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#EF4444',
    },
    sheetTileValue: {
        fontSize: 15,
        fontWeight: '800',
    },
    sheetTileSub: {
        fontSize: 10,
        fontWeight: '700',
        color: '#991B1B',
    },
    sheetSectionLabel: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: 8,
    },
    sheetSectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    sheetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
    },
    sheetRowAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 12,
    },
    sheetActionBtnText: {
        color: '#FFF',
        fontSize: 12.5,
        fontWeight: '800',
    },
    seeAll: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
    progressBarBackground: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 4,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    rowCallBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#DCFCE7',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
});
