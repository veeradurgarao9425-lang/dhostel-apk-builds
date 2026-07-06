import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/ui/EmptyState';
import api from '../services/api';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');
const BLUE       = '#2245D4';
const BLUE_SOFT  = '#EEF2FF';
const WHITE      = '#FFFFFF';
const TEXT_DARK  = '#1A1A1A';
const TEXT_MID   = '#6B7280';
const BORDER     = '#E5E7EB';
const BG         = '#F8FAFD';
const STAR_COLOR = '#F59E0B';
const DANGER     = '#EF4444';
const DANGER_BG  = '#FEE2E2';
const SUCCESS    = '#22C55E';
const SUCCESS_BG = '#DCFCE7';

// ── Helpers ───────────────────────────────────────────────────────────────────

function StarDisplay({ value, size = 16 }: { value: number; size?: number }) {
    return (
        <View style={{ flexDirection: 'row', gap: 2 }}>
            {[1, 2, 3, 4, 5].map(n => (
                <Ionicons key={n} name={n <= value ? 'star' : 'star-outline'}
                    size={size} color={n <= value ? STAR_COLOR : '#D1D5DB'} />
            ))}
        </View>
    );
}

function PctBar({ pct, color = BLUE }: { pct: number; color?: string }) {
    return (
        <View style={s.pctBarBg}>
            <View style={[s.pctBarFill, { width: `${Math.max(pct, 2)}%`, backgroundColor: color }]} />
        </View>
    );
}

// Satisfaction label based on %
function satisfactionLabel(lowPct: number) {
    if (lowPct >= 50) return { label: 'Needs Attention', color: DANGER, bg: DANGER_BG };
    if (lowPct >= 30) return { label: 'Below Average', color: '#D97706', bg: '#FFFBEB' };
    if (lowPct >= 15) return { label: 'Acceptable', color: BLUE, bg: BLUE_SOFT };
    return { label: 'Doing Well', color: SUCCESS, bg: SUCCESS_BG };
}

const MEAL_LABELS: Record<string, { label: string; icon: string; color: string; bg: string }> = {
    morning:  { label: 'Breakfast', icon: 'sunny-outline',     color: '#F97316', bg: '#FFEDD5' },
    lunch:    { label: 'Lunch',     icon: 'restaurant-outline', color: '#E11D48', bg: '#FFF1F2' },
    dinner:   { label: 'Dinner',    icon: 'moon-outline',       color: '#6366F1', bg: '#EEF2FF' },
};

const CAT_CONFIG: Record<string, { label: string; icon: string }> = {
    food:         { label: 'Food Quality',    icon: 'restaurant-outline' },
    cleanliness:  { label: 'Cleanliness',     icon: 'sparkles-outline'   },
    staff:        { label: 'Staff Behavior',  icon: 'people-outline'     },
    facilities:   { label: 'Facilities',      icon: 'business-outline'   },
    value:        { label: 'Value for Money', icon: 'cash-outline'       },
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function RatingsManagementScreen({ navigation }: any) {
    const { user } = useAuth();
    const [tab, setTab]             = useState<'analytics' | 'reviews'>('analytics');
    const [loadingA, setLoadingA]   = useState(true);
    const [loadingR, setLoadingR]   = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Analytics data
    const [messData, setMessData]     = useState<any>(null);
    const [ratingData, setRatingData] = useState<any>(null);

    // Reviews data
    const [ratings, setRatings]   = useState<any[]>([]);
    const [average, setAverage]   = useState<string | null>(null);
    const [total, setTotal]       = useState(0);
    const [filterStar, setFilterStar] = useState<number | null>(null);

    const hostelId = user?.hostel_id;

    const fetchAnalytics = useCallback(async () => {
        if (!hostelId) return;
        try {
            const [messRes, ratRes] = await Promise.allSettled([
                api.get(`/mess/analytics?hostel_id=${hostelId}`),
                api.get(`/ratings/analytics/${hostelId}`),
            ]);
            if (messRes.status === 'fulfilled' && messRes.value.data?.success) {
                setMessData(messRes.value.data.data);
            }
            if (ratRes.status === 'fulfilled' && ratRes.value.data?.success) {
                setRatingData(ratRes.value.data.data);
            }
        } catch (e) {
            console.error('Analytics fetch error:', e);
        } finally {
            setLoadingA(false);
        }
    }, [hostelId]);

    const fetchReviews = useCallback(async () => {
        if (!hostelId) return;
        try {
            const res = await api.get(`/ratings/hostel/${hostelId}`);
            if (res.data?.success) {
                setRatings(res.data.data || []);
                setAverage(res.data.average || null);
                setTotal(res.data.total || 0);
            }
        } catch (e) {
            console.error('Reviews fetch error:', e);
        } finally {
            setLoadingR(false);
            setRefreshing(false);
        }
    }, [hostelId]);

    useEffect(() => {
        fetchAnalytics();
        fetchReviews();
    }, [fetchAnalytics, fetchReviews]);

    const onRefresh = () => {
        setRefreshing(true);
        setLoadingA(true);
        setLoadingR(true);
        Promise.all([fetchAnalytics(), fetchReviews()]).finally(() => setRefreshing(false));
    };

    const isLoading = tab === 'analytics' ? loadingA : loadingR;

    // ── Analytics Tab ─────────────────────────────────────────────────────────

    const renderAnalytics = () => {
        if (loadingA) return <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 60 }} />;

        const today = messData?.today || {};
        const trend = messData?.trend || [];
        const totalStudents = messData?.totalStudents || 0;
        const catData = ratingData?.categories || {};
        const overall = ratingData?.overall;

        return (
            <>
                {/* ── Today's Meal Skip Overview ── */}
                <View style={s.sectionCard}>
                    <View style={s.sectionHeaderRow}>
                        <Ionicons name="today-outline" size={20} color={BLUE} />
                        <Text style={s.sectionTitle}>Today's Meal Feedback</Text>
                    </View>
                    <Text style={s.sectionSub}>
                        Based on {totalStudents} active student{totalStudents !== 1 ? 's' : ''}
                    </Text>

                    {totalStudents === 0 ? (
                        <Text style={s.emptyNote}>No active students found in this hostel.</Text>
                    ) : (
                        Object.entries(MEAL_LABELS).map(([key, cfg]) => {
                            const mData = today[key] || { skipped: 0, total: totalStudents, pct: 0 };
                            const sat = satisfactionLabel(mData.pct);
                            return (
                                <View key={key} style={s.mealRow}>
                                    <View style={[s.mealIconWrap, { backgroundColor: cfg.bg }]}>
                                        <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <View style={s.mealLabelRow}>
                                            <Text style={s.mealLabel}>{cfg.label}</Text>
                                            <View style={[s.satPill, { backgroundColor: sat.bg }]}>
                                                <Text style={[s.satPillTxt, { color: sat.color }]}>{sat.label}</Text>
                                            </View>
                                        </View>
                                        <PctBar pct={mData.pct} color={mData.pct >= 40 ? DANGER : mData.pct >= 20 ? '#F59E0B' : SUCCESS} />
                                        <Text style={s.pctNote}>
                                            {mData.skipped} of {totalStudents} students skipped ({mData.pct}%)
                                        </Text>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>

                {/* ── 7-Day Skip Trend ── */}
                {trend.length > 0 && (
                    <View style={s.sectionCard}>
                        <View style={s.sectionHeaderRow}>
                            <Ionicons name="trending-up-outline" size={20} color={BLUE} />
                            <Text style={s.sectionTitle}>7-Day Skip Trend</Text>
                        </View>
                        <Text style={s.sectionSub}>% of students skipping each meal per day</Text>

                        {/* Mini table */}
                        <View style={s.trendTable}>
                            <View style={[s.trendRow, { borderBottomWidth: 1, borderBottomColor: BORDER }]}>
                                <Text style={[s.trendCell, s.trendHeader, { flex: 1.5 }]}>Day</Text>
                                <Text style={[s.trendCell, s.trendHeader]}>Breakfast</Text>
                                <Text style={[s.trendCell, s.trendHeader]}>Lunch</Text>
                                <Text style={[s.trendCell, s.trendHeader]}>Dinner</Text>
                            </View>
                            {trend.slice(-7).map((d: any, i: number) => {
                                const isToday = i === trend.slice(-7).length - 1;
                                return (
                                    <View key={d.date} style={[s.trendRow, isToday && { backgroundColor: BLUE_SOFT }]}>
                                        <Text style={[s.trendCell, s.trendDayLbl, { flex: 1.5 }]}>
                                            {isToday ? 'Today' : d.label?.split(',')[0] || d.date.slice(5)}
                                        </Text>
                                        {(['morning', 'lunch', 'dinner'] as const).map(m => {
                                            const pct = d[m]?.pct ?? 0;
                                            const col = pct >= 40 ? DANGER : pct >= 20 ? '#D97706' : SUCCESS;
                                            return (
                                                <Text key={m} style={[s.trendCell, s.trendPct, { color: col }]}>
                                                    {pct}%
                                                </Text>
                                            );
                                        })}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* ── Category Satisfaction (from ratings) ── */}
                {ratingData && ratingData.total > 0 && (
                    <View style={s.sectionCard}>
                        <View style={s.sectionHeaderRow}>
                            <Ionicons name="star-outline" size={20} color={STAR_COLOR} />
                            <Text style={s.sectionTitle}>Category Satisfaction</Text>
                        </View>
                        <Text style={s.sectionSub}>
                            Based on {ratingData.total} rating{ratingData.total !== 1 ? 's' : ''} •{' '}
                            Overall avg: {overall?.avg ?? '—'}/5
                        </Text>

                        {Object.entries(CAT_CONFIG).map(([key, cfg]) => {
                            const cat = catData[key];
                            if (!cat) return null;
                            const sat = satisfactionLabel(cat.low_pct);
                            return (
                                <View key={key} style={s.catRow}>
                                    <View style={s.catRowTop}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Ionicons name={cfg.icon as any} size={16} color={TEXT_MID} />
                                            <Text style={s.catLabel}>{cfg.label}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <View style={[s.satPill, { backgroundColor: sat.bg }]}>
                                                <Text style={[s.satPillTxt, { color: sat.color }]}>{sat.label}</Text>
                                            </View>
                                            <Text style={s.catAvg}>{cat.avg}/5</Text>
                                        </View>
                                    </View>

                                    {/* Satisfaction bar */}
                                    <View style={s.satisfactionBarWrap}>
                                        <View style={[s.satisfactionBarFill, {
                                            width: `${cat.high_pct}%`,
                                            backgroundColor: SUCCESS,
                                        }]} />
                                        <View style={[s.satisfactionBarFill, {
                                            width: `${cat.low_pct}%`,
                                            backgroundColor: DANGER,
                                            marginLeft: 'auto',
                                        }]} />
                                    </View>

                                    <View style={s.satisfactionLegend}>
                                        <Text style={[s.legTxt, { color: SUCCESS }]}>
                                            {cat.high_pct}% satisfied (4-5 ★)
                                        </Text>
                                        <Text style={[s.legTxt, { color: DANGER }]}>
                                            {cat.low_pct}% dissatisfied (1-2 ★)
                                        </Text>
                                    </View>

                                    {/* Star distribution */}
                                    <View style={s.distRow}>
                                        {[5, 4, 3, 2, 1].map((star, i) => {
                                            const count = cat.dist?.[star - 1] ?? 0;
                                            const pct = cat.count > 0 ? Math.round((count / cat.count) * 100) : 0;
                                            return (
                                                <View key={star} style={s.distItem}>
                                                    <Text style={s.distStar}>{star}★</Text>
                                                    <PctBar pct={pct} color={star >= 4 ? SUCCESS : star === 3 ? '#F59E0B' : DANGER} />
                                                    <Text style={s.distPct}>{pct}%</Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {!messData && !ratingData && (
                    <View style={{ alignItems: 'center', paddingTop: 60 }}>
                        <Ionicons name="analytics-outline" size={56} color="#CBD5E1" />
                        <Text style={{ fontSize: 16, fontWeight: '700', color: TEXT_MID, marginTop: 16 }}>No Analytics Yet</Text>
                        <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }}>
                            Analytics appear once tenants start rating meals and submitting reviews.
                        </Text>
                    </View>
                )}
            </>
        );
    };

    // ── Reviews Tab ───────────────────────────────────────────────────────────

    const renderReviews = () => {
        if (loadingR) return <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 60 }} />;
        const displayed = filterStar ? ratings.filter(r => r.rating === filterStar) : ratings;
        const avgNum = average ? parseFloat(average) : 0;

        return (
            <>
                {total > 0 && (
                    <View style={s.summaryCard}>
                        <View style={s.summaryLeft}>
                            <Text style={s.avgNumber}>{average ?? '—'}</Text>
                            <StarDisplay value={Math.round(avgNum)} size={20} />
                            <Text style={s.totalTxt}>{total} review{total !== 1 ? 's' : ''}</Text>
                        </View>
                        <View style={s.summaryRight}>
                            {[5, 4, 3, 2, 1].map(star => {
                                const count = ratings.filter(r => r.rating === star).length;
                                const pct = total > 0 ? (count / total) * 100 : 0;
                                return (
                                    <View key={star} style={s.barRow}>
                                        <Text style={s.barLabel}>{star}</Text>
                                        <Ionicons name="star" size={10} color={STAR_COLOR} />
                                        <View style={s.barBg}>
                                            <View style={[s.barFill, { width: `${pct}%` }]} />
                                        </View>
                                        <Text style={s.barCount}>{count}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {total > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 0 }}>
                            <TouchableOpacity
                                style={[s.filterPill, !filterStar && s.filterPillActive]}
                                onPress={() => setFilterStar(null)}>
                                <Text style={[s.filterPillTxt, !filterStar && s.filterPillTxtActive]}>All</Text>
                            </TouchableOpacity>
                            {[5, 4, 3, 2, 1].map(star => (
                                <TouchableOpacity key={star}
                                    style={[s.filterPill, filterStar === star && s.filterPillActive]}
                                    onPress={() => setFilterStar(filterStar === star ? null : star)}>
                                    <Ionicons name="star" size={12} color={filterStar === star ? WHITE : STAR_COLOR} />
                                    <Text style={[s.filterPillTxt, filterStar === star && s.filterPillTxtActive]}>{star}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                )}

                {displayed.length === 0 ? (
                    <EmptyState illustration="megaphone" title="No Reviews Yet" subtitle="Tenant reviews will appear here once submitted." />
                ) : (
                    displayed.map((r: any, i: number) => {
                        const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || 'Anonymous';
                        const hasCats = r.cleanliness_rating || r.food_rating || r.staff_rating || r.facilities_rating || r.value_rating;
                        const date = r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
                        return (
                            <View key={r.rating_id || i} style={s.reviewCard}>
                                <View style={s.cardHeader}>
                                    <View style={s.avatarCircle}>
                                        <Text style={s.avatarTxt}>
                                            {name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.tenantName}>{name}</Text>
                                        <Text style={s.dateTxt}>{date}</Text>
                                    </View>
                                    <View style={s.ratingBadge}>
                                        <Ionicons name="star" size={14} color={STAR_COLOR} />
                                        <Text style={s.ratingNum}>{r.rating}/5</Text>
                                    </View>
                                </View>
                                <StarDisplay value={r.rating} size={18} />
                                {r.comment ? <Text style={s.commentTxt}>"{r.comment}"</Text> : null}
                                {hasCats && (
                                    <View style={s.catGrid}>
                                        {Object.entries(CAT_CONFIG).map(([key, cfg]) => {
                                            const val = r[`${key}_rating`];
                                            if (!val) return null;
                                            return (
                                                <View key={key} style={s.catChip}>
                                                    <Text style={s.catChipLbl}>{cfg.label}</Text>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                                        <Ionicons name="star" size={11} color={STAR_COLOR} />
                                                        <Text style={s.catChipVal}>{val}</Text>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </>
        );
    };

    return (
        <View style={s.container}>
            <AppHeader title="Tenant Reviews & Analytics" onBack={() => navigation.goBack()} />

            {/* Tab toggle */}
            <View style={s.tabBar}>
                <TouchableOpacity style={[s.tabBtn, tab === 'analytics' && s.tabBtnActive]} onPress={() => setTab('analytics')}>
                    <Ionicons name="bar-chart-outline" size={16} color={tab === 'analytics' ? WHITE : TEXT_MID} />
                    <Text style={[s.tabBtnTxt, tab === 'analytics' && s.tabBtnTxtActive]}>Analytics</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.tabBtn, tab === 'reviews' && s.tabBtnActive]} onPress={() => setTab('reviews')}>
                    <Ionicons name="star-outline" size={16} color={tab === 'reviews' ? WHITE : TEXT_MID} />
                    <Text style={[s.tabBtnTxt, tab === 'reviews' && s.tabBtnTxtActive]}>Reviews {total > 0 ? `(${total})` : ''}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={s.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BLUE]} />}
            >
                {tab === 'analytics' ? renderAnalytics() : renderReviews()}
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    scroll: { padding: 16, paddingBottom: 48 },

    tabBar: {
        flexDirection: 'row', margin: 16, marginBottom: 0,
        backgroundColor: WHITE, borderRadius: 14, padding: 4,
        borderWidth: 1, borderColor: BORDER,
    },
    tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10 },
    tabBtnActive: { backgroundColor: BLUE },
    tabBtnTxt: { fontSize: 14, fontWeight: '700', color: TEXT_MID },
    tabBtnTxtActive: { color: WHITE },

    // Section cards
    sectionCard: {
        backgroundColor: WHITE, borderRadius: 20, padding: 20, marginBottom: 16,
        borderWidth: 1, borderColor: BORDER,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: TEXT_DARK },
    sectionSub: { fontSize: 12, color: TEXT_MID, marginBottom: 16, marginLeft: 28 },
    emptyNote: { fontSize: 13, color: TEXT_MID, textAlign: 'center', paddingVertical: 16 },

    // Meal rows
    mealRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    mealIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    mealLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    mealLabel: { fontSize: 14, fontWeight: '700', color: TEXT_DARK },
    satPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    satPillTxt: { fontSize: 10, fontWeight: '800' },
    pctNote: { fontSize: 11, color: TEXT_MID, marginTop: 4 },

    // Progress bars
    pctBarBg: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
    pctBarFill: { height: '100%', borderRadius: 4 },

    // 7-day trend table
    trendTable: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
    trendRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12 },
    trendCell: { flex: 1, textAlign: 'center', fontSize: 12 },
    trendHeader: { fontWeight: '800', color: TEXT_MID },
    trendDayLbl: { fontWeight: '700', color: TEXT_DARK, textAlign: 'left' },
    trendPct: { fontWeight: '800' },

    // Category satisfaction
    catRow: { marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: BORDER },
    catRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    catLabel: { fontSize: 14, fontWeight: '700', color: TEXT_DARK },
    catAvg: { fontSize: 14, fontWeight: '800', color: TEXT_DARK },
    satisfactionBarWrap: {
        height: 10, backgroundColor: '#F3F4F6', borderRadius: 5,
        flexDirection: 'row', overflow: 'hidden', marginBottom: 6,
    },
    satisfactionBarFill: { height: '100%' },
    satisfactionLegend: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    legTxt: { fontSize: 11, fontWeight: '700' },
    distRow: { flexDirection: 'row', gap: 6 },
    distItem: { flex: 1, alignItems: 'center', gap: 4 },
    distStar: { fontSize: 10, color: TEXT_MID, fontWeight: '700' },
    distPct: { fontSize: 10, color: TEXT_MID, fontWeight: '600' },

    // Summary card (reviews tab)
    summaryCard: {
        backgroundColor: WHITE, borderRadius: 20, padding: 20, marginBottom: 16,
        flexDirection: 'row', borderWidth: 1, borderColor: BORDER,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    summaryLeft: { alignItems: 'center', justifyContent: 'center', paddingRight: 20, borderRightWidth: 1, borderRightColor: BORDER, marginRight: 20, minWidth: 80 },
    avgNumber: { fontSize: 40, fontWeight: '900', color: TEXT_DARK, marginBottom: 8 },
    totalTxt: { fontSize: 12, color: TEXT_MID, marginTop: 6, fontWeight: '600' },
    summaryRight: { flex: 1, justifyContent: 'center', gap: 4 },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    barLabel: { fontSize: 11, color: TEXT_MID, width: 10 },
    barBg: { flex: 1, height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
    barFill: { height: '100%', backgroundColor: STAR_COLOR, borderRadius: 3 },
    barCount: { fontSize: 11, color: TEXT_MID, width: 16, textAlign: 'right' },

    filterPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: WHITE },
    filterPillActive: { backgroundColor: BLUE, borderColor: BLUE },
    filterPillTxt: { fontSize: 13, fontWeight: '700', color: TEXT_MID },
    filterPillTxtActive: { color: WHITE },

    // Review cards
    reviewCard: {
        backgroundColor: WHITE, borderRadius: 20, padding: 20, marginBottom: 12,
        borderWidth: 1, borderColor: BORDER,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: BLUE_SOFT, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarTxt: { fontSize: 16, fontWeight: '800', color: BLUE },
    tenantName: { fontSize: 15, fontWeight: '700', color: TEXT_DARK },
    dateTxt: { fontSize: 12, color: TEXT_MID, marginTop: 2 },
    ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    ratingNum: { fontSize: 13, fontWeight: '800', color: '#92400E' },
    commentTxt: { fontSize: 14, color: TEXT_MID, fontStyle: 'italic', lineHeight: 22, marginTop: 12, marginBottom: 8 },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F9FAFB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: BORDER },
    catChipLbl: { fontSize: 11, color: TEXT_MID, fontWeight: '600' },
    catChipVal: { fontSize: 12, fontWeight: '800', color: TEXT_DARK },
});
