import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { ModalSheet } from '../../components/FormComponents';

interface CollectionDetailsSheetProps {
    data: {
        todayAmount?: number;
        monthAmount?: number;
        monthDue?: number;
        totalDuesAmount?: number;
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

    const close = () => setShowCollectionSheet(false);

    const mName = data.collectionStats.monthName || 'Month';

    return (
        <ModalSheet visible={showCollectionSheet} onClose={close} maxHeight="88%">

            {/* ── Fixed Header ── */}
            <View style={[s.header, { borderBottomColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[s.headerIconWrap, { backgroundColor: '#10B98115' }]}>
                        <Ionicons name="wallet" size={16} color="#10B981" />
                    </View>
                    <View>
                        <Text style={[s.headerTitle, { color: theme.textPrimary }]}>
                            {mName} Collection
                        </Text>
                        <Text style={[s.headerSub, { color: theme.textSecondary }]}>
                            {data.collectionStats.tenantsCount} tenants · {pct}% collected
                        </Text>
                    </View>
                </View>
                <TouchableOpacity onPress={close} style={[s.closeBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                    <Ionicons name="close" size={16} color={theme.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* ── Scrollable Content ── */}
            <ScrollView
                contentContainerStyle={s.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >

                {/* Hero: Collected / Pending / Target */}
                <View style={[s.hero, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                    {/* Big percentage circle */}
                    <View style={[s.heroPctCircle, { borderColor: '#10B981' }]}>
                        <Text style={[s.heroPct, { color: '#10B981' }]}>{pct}%</Text>
                        <Text style={[s.heroPctLabel, { color: theme.textSecondary }]}>done</Text>
                    </View>

                    {/* Right side stats */}
                    <View style={{ flex: 1, gap: 6 }}>
                        <View style={s.heroRow}>
                            <View style={s.heroDot} />
                            <Text style={[s.heroRowLabel, { color: theme.textSecondary }]}>Collected</Text>
                            <Text style={[s.heroRowValue, { color: '#10B981' }]}>
                                ₹{data.collectionStats.collected.toLocaleString('en-IN')}
                            </Text>
                        </View>
                        <View style={[s.heroDivider, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]} />
                        <View style={s.heroRow}>
                            <View style={[s.heroDot, { backgroundColor: '#E11D48' }]} />
                            <Text style={[s.heroRowLabel, { color: theme.textSecondary }]}>Pending</Text>
                            <Text style={[s.heroRowValue, { color: '#E11D48' }]}>
                                ₹{data.collectionStats.pending.toLocaleString('en-IN')}
                            </Text>
                        </View>
                        <View style={[s.heroDivider, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]} />
                        <View style={s.heroRow}>
                            <View style={[s.heroDot, { backgroundColor: theme.textSecondary }]} />
                            <Text style={[s.heroRowLabel, { color: theme.textSecondary }]}>Target</Text>
                            <Text style={[s.heroRowValue, { color: theme.textPrimary }]}>
                                ₹{data.collectionStats.totalExpected.toLocaleString('en-IN')}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Progress bar */}
                <View style={[s.progressBg, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                    <View style={[s.progressFill, { width: `${pct}%` }]} />
                </View>

                {/* ── Scrollable Horizontal Stat Tiles ── */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
                >
                    {/* Today Collection */}
                    <View style={[s.tile, { backgroundColor: isDark ? '#0A1F14' : '#E8FDF5' }]}>
                        <Ionicons name="cash" size={15} color="#10B981" />
                        <Text style={[s.tileValue, { color: '#10B981' }]} numberOfLines={1}>
                            ₹{(data.todayAmount || 0).toLocaleString('en-IN')}
                        </Text>
                        <Text style={[s.tileLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                            Today Coll.
                        </Text>
                    </View>

                    {/* This Month Collection */}
                    <View style={[s.tile, { backgroundColor: isDark ? '#0A1F14' : '#E8FDF5' }]}>
                        <Ionicons name="wallet" size={15} color="#10B981" />
                        <Text style={[s.tileValue, { color: '#10B981' }]} numberOfLines={1}>
                            ₹{data.collectionStats.collected.toLocaleString('en-IN')}
                        </Text>
                        <Text style={[s.tileLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                            {mName} Coll.
                        </Text>
                    </View>

                    {/* This Month Dues */}
                    <TouchableOpacity
                        style={[s.tile, { backgroundColor: isDark ? '#1A1000' : '#FFFBEB' }]}
                        activeOpacity={0.75}
                        onPress={() => { close(); navigation.navigate('PendingTab', { tab: 'All Dues' }); }}
                    >
                        <Ionicons name="hourglass" size={15} color="#D97706" />
                        <Text style={[s.tileValue, { color: '#D97706' }]} numberOfLines={1}>
                            ₹{data.collectionStats.pending.toLocaleString('en-IN')}
                        </Text>
                        <Text style={[s.tileLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                            {mName} Dues
                        </Text>
                    </TouchableOpacity>

                    {/* All Dues */}
                    <TouchableOpacity
                        style={[s.tile, { backgroundColor: isDark ? '#2A0A0A' : '#FFF1F2' }]}
                        activeOpacity={0.75}
                        onPress={() => { close(); navigation.navigate('PendingTab', { tab: 'All Dues' }); }}
                    >
                        <Ionicons name="alert-circle" size={15} color="#E11D48" />
                        <Text style={[s.tileValue, { color: '#E11D48' }]} numberOfLines={1}>
                            ₹{(data.totalDuesAmount || 0).toLocaleString('en-IN')}
                        </Text>
                        <Text style={[s.tileLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                            All Dues
                        </Text>
                    </TouchableOpacity>

                    {/* Overdue */}
                    <TouchableOpacity
                        style={[s.tile, { backgroundColor: isDark ? '#2A0A0A' : '#FFF1F2' }]}
                        activeOpacity={0.75}
                        onPress={() => { close(); navigation.navigate('PendingTab', { tab: 'Overdue' }); }}
                    >
                        <Ionicons name="warning" size={15} color="#E11D48" />
                        <Text style={[s.tileValue, { color: '#E11D48' }]} numberOfLines={1}>
                            ₹{(data.collectionStats.overdueAmount || 0).toLocaleString('en-IN')}
                        </Text>
                        <Text style={[s.tileLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                            Overdue Dues
                        </Text>
                    </TouchableOpacity>

                    {/* Due Today (Count) */}
                    <TouchableOpacity
                        style={[s.tile, { backgroundColor: isDark ? '#1A1000' : '#FFFBEB' }]}
                        activeOpacity={0.75}
                        onPress={() => { close(); navigation.navigate('PendingTab', { tab: 'Next 7 Days' }); }}
                    >
                        <Ionicons name="time" size={15} color="#D97706" />
                        <Text style={[s.tileValue, { color: '#D97706' }]} numberOfLines={1}>
                            {data.collectionStats.dueTodayCount}
                        </Text>
                        <Text style={[s.tileLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                            Due Today
                        </Text>
                    </TouchableOpacity>

                    {/* This Week (Count) */}
                    <TouchableOpacity
                        style={[s.tile, { backgroundColor: isDark ? '#0A0A1A' : '#EEF2FF' }]}
                        activeOpacity={0.75}
                        onPress={() => { close(); navigation.navigate('PendingTab', { tab: 'Next 7 Days' }); }}
                    >
                        <Ionicons name="calendar" size={15} color="#4F46E5" />
                        <Text style={[s.tileValue, { color: '#4F46E5' }]} numberOfLines={1}>
                            {data.collectionStats.dueThisWeekCount}
                        </Text>
                        <Text style={[s.tileLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                            This Week
                        </Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* ── Overdue tenants preview ── */}
                {data.unpaidStudents && data.unpaidStudents.length > 0 && (
                    <View style={s.listSection}>
                        <View style={s.listSectionHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                <Ionicons name="warning" size={12} color="#E11D48" />
                                <Text style={[s.listSectionTitle, { color: theme.textPrimary }]}>Overdue Tenants</Text>
                            </View>
                            <TouchableOpacity onPress={() => { close(); navigation.navigate('PendingTab'); }}>
                                <Text style={s.seeAll}>{t('dashboard.viewAll')}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={[s.listCard, { backgroundColor: isDark ? '#0F172A' : '#FFF', borderColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                            {data.unpaidStudents.slice(0, 3).map((item, idx) => (
                                <View key={idx} style={[s.listRow, { borderBottomColor: isDark ? '#1E293B' : '#F8FAFC' }, idx === 2 && { borderBottomWidth: 0 }]}>
                                    <TouchableOpacity
                                        style={s.listRowLeft}
                                        activeOpacity={0.7}
                                        onPress={() => { close(); navigation.navigate('StudentDetails', { studentId: item.id }); }}
                                    >
                                        <View style={s.avatarRed}>
                                            <Text style={s.avatarRedText}>{avatarLetter(item.name)}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[s.listRowName, { color: theme.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                                            <Text style={[s.listRowMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                                                {item.room_number ? `Room ${item.room_number} · ` : ''}{item.daysLate}d late
                                            </Text>
                                        </View>
                                        <Text style={s.listRowAmount}>₹{Number(item.amount).toLocaleString('en-IN')}</Text>
                                    </TouchableOpacity>
                                    {!!item.phone && (
                                        <TouchableOpacity style={s.callBtn} onPress={() => Linking.openURL(`tel:${item.phone}`)}>
                                            <Ionicons name="call" size={13} color="#10B981" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* ── Upcoming dues preview ── */}
                {data.upcomingDues && data.upcomingDues.length > 0 && (
                    <View style={s.listSection}>
                        <View style={s.listSectionHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                <Ionicons name="time" size={12} color="#D97706" />
                                <Text style={[s.listSectionTitle, { color: theme.textPrimary }]}>Due in 7 Days</Text>
                            </View>
                            <TouchableOpacity onPress={() => { close(); navigation.navigate('PendingTab', { tab: 'Next 7 Days' }); }}>
                                <Text style={s.seeAll}>{t('dashboard.viewAll')}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={[s.listCard, { backgroundColor: isDark ? '#0F172A' : '#FFF', borderColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                            {data.upcomingDues.slice(0, 3).map((item, idx) => (
                                <View key={idx} style={[s.listRow, { borderBottomColor: isDark ? '#1E293B' : '#F8FAFC' }, idx === 2 && { borderBottomWidth: 0 }]}>
                                    <TouchableOpacity
                                        style={s.listRowLeft}
                                        activeOpacity={0.7}
                                        onPress={() => { close(); navigation.navigate('StudentDetails', { studentId: item.id }); }}
                                    >
                                        <View style={s.avatarAmber}>
                                            <Text style={s.avatarAmberText}>{avatarLetter(item.name)}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[s.listRowName, { color: theme.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                                            <Text style={[s.listRowMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                                                {item.room_number ? `Room ${item.room_number} · ` : ''}{item.daysLeft === 0 ? 'Due today' : `Due in ${item.daysLeft}d`}
                                            </Text>
                                        </View>
                                        <Text style={s.listRowAmountAmber}>₹{Number(item.amount).toLocaleString('en-IN')}</Text>
                                    </TouchableOpacity>
                                    {!!item.phone && (
                                        <TouchableOpacity style={s.callBtn} onPress={() => Linking.openURL(`tel:${item.phone}`)}>
                                            <Ionicons name="call" size={13} color="#10B981" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                <View style={{ height: 8 }} />
            </ScrollView>

            {/* ── Fixed Footer: Two action buttons always visible ── */}
            <View style={[s.footer, { borderTopColor: isDark ? '#1E293B' : '#F1F5F9', backgroundColor: isDark ? '#0F172A' : '#FFF' }]}>
                <TouchableOpacity
                    style={[s.footerBtnSecondary, { borderColor: '#10B981', backgroundColor: isDark ? '#10B98115' : '#ECFDF5' }]}
                    activeOpacity={0.85}
                    onPress={() => { close(); navigation.navigate('BillReminders'); }}
                >
                    <Ionicons name="notifications" size={15} color="#10B981" />
                    <Text style={[s.footerBtnTextSecondary, { color: '#10B981' }]}>Send Reminders</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[s.footerBtnPrimary, { backgroundColor: theme.primary }]}
                    activeOpacity={0.85}
                    onPress={() => { close(); navigation.navigate('PendingTab'); }}
                >
                    <Ionicons name="list" size={15} color="#FFF" />
                    <Text style={s.footerBtnTextPrimary}>View All Dues</Text>
                </TouchableOpacity>
            </View>

        </ModalSheet>
    );
};

const s = StyleSheet.create({
    // ── Header ──────────────────────────────────────────────────────────────
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 14,
        marginBottom: 2,
        borderBottomWidth: 1,
    },
    headerIconWrap: {
        width: 34, height: 34, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 16, fontWeight: '800' },
    headerSub: { fontSize: 11, fontWeight: '600', marginTop: 1 },
    closeBtn: {
        width: 30, height: 30, borderRadius: 15,
        alignItems: 'center', justifyContent: 'center',
    },

    // ── Scroll ───────────────────────────────────────────────────────────────
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 8,
    },

    // ── Hero ─────────────────────────────────────────────────────────────────
    hero: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
    },
    heroPctCircle: {
        width: 62, height: 62, borderRadius: 31,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2.5,
    },
    heroPct: { fontSize: 18, fontWeight: '900' },
    heroPctLabel: { fontSize: 9, fontWeight: '600', marginTop: 1 },
    heroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    heroDot: {
        width: 7, height: 7, borderRadius: 4,
        backgroundColor: '#10B981',
    },
    heroRowLabel: { fontSize: 11, fontWeight: '600', flex: 1 },
    heroRowValue: { fontSize: 13, fontWeight: '800' },
    heroDivider: { height: 1, marginVertical: 1 },

    // ── Progress ─────────────────────────────────────────────────────────────
    progressBg: {
        height: 7, borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 16,
    },
    progressFill: {
        height: '100%', borderRadius: 4,
        backgroundColor: '#10B981',
    },

    // ── 4 tiles ──────────────────────────────────────────────────────────────
    tilesRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 18,
    },
    tile: {
        width: 106,
        borderRadius: 12,
        padding: 10,
        alignItems: 'center',
        gap: 3,
    },
    tileValue: {
        fontSize: 16, fontWeight: '800',
    },
    tileLabel: {
        fontSize: 9.5, fontWeight: '600', textAlign: 'center',
    },
    tileSub: {
        fontSize: 9, fontWeight: '700', color: '#E11D48', textAlign: 'center',
    },

    // ── List section ─────────────────────────────────────────────────────────
    listSection: { marginBottom: 14 },
    listSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    listSectionTitle: {
        fontSize: 12, fontWeight: '800',
        textTransform: 'uppercase', letterSpacing: 0.3,
    },
    seeAll: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
    listCard: {
        borderRadius: 14, borderWidth: 1, overflow: 'hidden',
    },
    listRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
    },
    listRowLeft: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    avatarRed: {
        width: 30, height: 30, borderRadius: 9,
        backgroundColor: '#FFE4E6',
        alignItems: 'center', justifyContent: 'center',
    },
    avatarRedText: { fontSize: 12, fontWeight: '800', color: '#E11D48' },
    avatarAmber: {
        width: 30, height: 30, borderRadius: 9,
        backgroundColor: '#FEF3C7',
        alignItems: 'center', justifyContent: 'center',
    },
    avatarAmberText: { fontSize: 12, fontWeight: '800', color: '#D97706' },
    listRowName: { fontSize: 12.5, fontWeight: '700' },
    listRowMeta: { fontSize: 10, fontWeight: '600', marginTop: 1 },
    listRowAmount: { fontSize: 13, fontWeight: '800', color: '#E11D48' },
    listRowAmountAmber: { fontSize: 13, fontWeight: '800', color: '#D97706' },
    callBtn: {
        width: 30, height: 30, borderRadius: 10,
        backgroundColor: '#DCFCE7',
        alignItems: 'center', justifyContent: 'center',
        marginLeft: 8,
    },

    // ── Footer (fixed at bottom) ─────────────────────────────────────────────
    footer: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 28,
        borderTopWidth: 1,
    },
    footerBtnSecondary: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 13,
        borderRadius: 12,
        borderWidth: 1.5,
    },
    footerBtnTextSecondary: {
        fontSize: 13, fontWeight: '800',
    },
    footerBtnPrimary: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 13,
        borderRadius: 12,
    },
    footerBtnTextPrimary: {
        color: '#FFF', fontSize: 13, fontWeight: '800',
    },
});
