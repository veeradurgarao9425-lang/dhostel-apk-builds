import React, { useState, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { WarningCards } from './WarningCards';
import { TopOverdueStudents } from './TopOverdueStudents';
import { UpcomingDues } from './UpcomingDues';
import { UpcomingCheckoutSchedules } from './UpcomingCheckoutSchedules';
import { OccupancyCard } from './OccupancyCard';

const { width: SCREEN_W } = Dimensions.get('window');
const BODY_PAD = 14;

interface StaffDashboardViewProps {
    data: any;
    theme: any;
    isDark: boolean;
    navigation: any;
    user: any;
    renewalStudents?: any[];
}

export const StaffDashboardView = ({
    data,
    theme,
    isDark,
    navigation,
    user,
    renewalStudents = [],
}: StaffDashboardViewProps) => {
    const { t } = useTranslation();
    const [currentPage, setCurrentPage] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    // Parse staff permissions
    const permissions = useMemo(() => {
        let perms = user?.permissions;
        if (typeof perms === 'string') {
            try {
                perms = JSON.parse(perms);
            } catch (_) {
                perms = {};
            }
        }
        return perms || {};
    }, [user?.permissions]);

    const hasPerm = (key: string) => {
        const val = permissions[key];
        return val === 'manage' || val === 'view' || val === true || val === '1';
    };

    // Calculate Occupancy & Bed Metrics
    const totalBeds = Number(data?.totalBeds || 0);
    const occupiedBeds = Number(data?.occupiedBeds || 0);
    const availableBeds = Number(data?.availableBeds || Math.max(totalBeds - occupiedBeds, 0));
    const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
    const totalRooms = Number(data?.totalRooms || 0);
    const availableRooms = Number(data?.availableRooms || 0);
    const totalStudentsCount = Number(data?.totalStudentsCount || data?.activeTenants || occupiedBeds);
    const pendingDuesTotal = Number(data?.totalDuesAmount || data?.pendingAmount || 0);
    const pendingCount = data?.unpaidStudents?.length || (pendingDuesTotal > 0 ? 1 : 0);

    const fmt = (n: number) => {
        if (!n) return '0';
        if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
        if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
        return `₹${n.toLocaleString('en-IN')}`;
    };

    // Filter Quick Actions strictly by staff permissions
    const quickActionItems = useMemo(() => {
        const list = [];
        if (hasPerm('students') || hasPerm('tenants')) {
            list.push({ label: 'Add Tenant', icon: 'person-add', color: '#7C3AED', bg: '#EDE9FE', route: 'AddStudent' });
        }
        if (hasPerm('rooms')) {
            list.push({ label: 'Rooms', icon: 'bed', color: '#0284C7', bg: '#E0F2FE', route: 'Rooms' });
        }
        if (hasPerm('dues') || hasPerm('finance')) {
            list.push({ label: 'Collect Rent', icon: 'cash', color: '#10B981', bg: '#D1FAE5', route: 'CollectedPayments' });
        }
        if (hasPerm('verify_rent')) {
            list.push({ label: 'Verify Rent', icon: 'shield-checkmark', color: '#2563EB', bg: '#DBEAFE', route: 'PaymentVerification' });
        }
        list.push({ label: 'KYC Files', icon: 'folder-open', color: '#9333EA', bg: '#F3E8FF', route: 'DocumentsHub' });
        if (hasPerm('complaints')) {
            list.push({ label: 'Complaints', icon: 'chatbubble-ellipses', color: '#E11D48', bg: '#FFE4E6', route: 'ComplaintsManagement' });
        }
        if (hasPerm('mess')) {
            list.push({ label: 'Mess Menu', icon: 'restaurant', color: '#EA580C', bg: '#FFEDD5', route: 'MessMenuManagement' });
        }
        if (hasPerm('notices')) {
            list.push({ label: 'Notices', icon: 'megaphone', color: '#4F46E5', bg: '#EEF2FF', route: 'NoticesManagement' });
        }
        if (hasPerm('expenses')) {
            list.push({ label: 'Add Expense', icon: 'receipt', color: '#D97706', bg: '#FEF3C7', route: 'AddExpense' });
        }
        return list;
    }, [permissions]);

    // Paginate in chunks of 4
    const actionPages = useMemo(() => {
        const pages = [];
        for (let i = 0; i < quickActionItems.length; i += 4) {
            pages.push(quickActionItems.slice(i, i + 4));
        }
        return pages.length > 0 ? pages : [[]];
    }, [quickActionItems]);

    const PAGE_W = SCREEN_W - BODY_PAD * 2;

    return (
        <View style={{ gap: 12 }}>
            {/* ── 1. Warning & Operational Alerts ── */}
            {(data.unallocatedCount > 0 || data.qrRegisterCount > 0 || data.openComplaintsCount > 0 || data.pendingAdmissionsCount > 0 || (data.vacateCount || 0) > 0) && (
                <View collapsable={false}>
                    <WarningCards data={data} />
                </View>
            )}

            {/* ── 2. Operational Overview Card (Matching Exact Owner Design) ── */}
            {(totalBeds > 0 || totalRooms > 0 || totalStudentsCount > 0) && (
                <View style={[s.card, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                    {/* Top row: Tenants + Rooms + Beds */}
                    <View style={s.topRow}>
                        {/* 1. Tenants */}
                        <TouchableOpacity
                            style={[s.topCell, { borderRightWidth: 1, borderRightColor: isDark ? '#334155' : '#EEF2FF' }]}
                            activeOpacity={0.7}
                            onPress={() => hasPerm('students') && navigation.navigate('Students')}
                        >
                            <View style={[s.iconPill, { backgroundColor: isDark ? '#2D1B69' : '#EDE9FE' }]}>
                                <Ionicons name="people" size={13} color="#7C3AED" />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={[s.topValue, { color: '#7C3AED' }]} numberOfLines={1}>
                                    {totalStudentsCount}
                                </Text>
                                <Text style={[s.topLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                                    Tenants
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* 2. Rooms */}
                        <TouchableOpacity
                            style={[s.topCell, { borderRightWidth: 1, borderRightColor: isDark ? '#334155' : '#EEF2FF' }]}
                            activeOpacity={0.7}
                            onPress={() => hasPerm('rooms') && navigation.navigate('Rooms')}
                        >
                            <View style={[s.iconPill, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF' }]}>
                                <Ionicons name="business" size={13} color="#4F46E5" />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={[s.topValue, { color: '#4F46E5' }]} numberOfLines={1}>
                                    {totalRooms}
                                </Text>
                                <Text style={[s.topLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                                    {availableRooms > 0 ? `${availableRooms} vacant` : 'Total Rooms'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* 3. Beds Occupied */}
                        <TouchableOpacity
                            style={s.topCell}
                            activeOpacity={0.7}
                            onPress={() => hasPerm('rooms') && navigation.navigate('Rooms')}
                        >
                            <View style={[s.iconPill, { backgroundColor: isDark ? '#0C2840' : '#E0F2FE' }]}>
                                <Ionicons name="bed" size={13} color="#0284C7" />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={[s.topValue, { color: '#0284C7' }]} numberOfLines={1}>
                                    {occupiedBeds}/{totalBeds}
                                </Text>
                                <Text style={[s.topLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                                    {occupancyPct}% full
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Divider */}
                    <View style={[s.hDivider, { backgroundColor: isDark ? '#1E293B' : '#EEF2FF' }]} />

                    {/* Bottom row: Operational Collections / Vacant Beds */}
                    <View style={s.bottomRow}>
                        {/* Pending Rent Dues */}
                        {(hasPerm('dues') || hasPerm('finance')) ? (
                            <TouchableOpacity
                                style={s.bottomCell}
                                activeOpacity={0.8}
                                onPress={() => navigation.navigate('PendingTab')}
                            >
                                <View style={[s.iconPill, { backgroundColor: isDark ? '#450A0A' : '#FEE2E2' }]}>
                                    <Ionicons name="alert-circle" size={13} color="#DC2626" />
                                </View>
                                <View style={{ flex: 1, minWidth: 0, paddingRight: 4 }}>
                                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 }} numberOfLines={1}>
                                        Pending Rent Dues
                                    </Text>
                                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#DC2626' }} numberOfLines={1}>
                                        {fmt(pendingDuesTotal)}
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>
                                        {pendingCount} {pendingCount === 1 ? 'tenant' : 'tenants'}
                                    </Text>
                                    <Text style={{ fontSize: 9.5, color: theme.textSecondary }}>overdue</Text>
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={s.bottomCell}
                                activeOpacity={0.8}
                                onPress={() => hasPerm('rooms') && navigation.navigate('Rooms')}
                            >
                                <View style={[s.iconPill, { backgroundColor: isDark ? '#0C2840' : '#E0F2FE' }]}>
                                    <Ionicons name="checkmark-circle" size={13} color="#0284C7" />
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 }} numberOfLines={1}>
                                        Available Capacity
                                    </Text>
                                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#0284C7' }} numberOfLines={1}>
                                        {availableBeds} Vacant Beds
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            {/* ── 3. Quick Actions Grid (Matching Owner Aesthetic) ── */}
            {quickActionItems.length > 0 && (
                <View style={[s.quickActionsCard, { backgroundColor: theme.cardBg, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
                    <FlatList
                        ref={flatListRef}
                        data={actionPages}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(_, index) => `staff_page_${index}`}
                        onMomentumScrollEnd={(e) => {
                            const page = Math.round(e.nativeEvent.contentOffset.x / PAGE_W);
                            setCurrentPage(page);
                        }}
                        renderItem={({ item: pageItems }) => (
                            <View style={[s.pageContainer, { width: PAGE_W }]}>
                                {pageItems.map((action: any, idx: number) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={s.actionBtn}
                                        onPress={() => navigation.navigate(action.route)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[s.actionIconBox, { backgroundColor: action.bg }]}>
                                            <Ionicons name={action.icon as any} size={20} color={action.color} />
                                        </View>
                                        <Text style={[s.actionLabel, { color: theme.textPrimary }]} numberOfLines={1}>
                                            {action.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    />

                    {actionPages.length > 1 && (
                        <View style={s.dotsRow}>
                            {actionPages.map((_, idx) => (
                                <View
                                    key={idx}
                                    style={[
                                        s.dot,
                                        {
                                            backgroundColor: currentPage === idx ? theme.primary : (isDark ? '#334155' : '#E2E8F0'),
                                            width: currentPage === idx ? 16 : 6,
                                        }
                                    ]}
                                />
                            ))}
                        </View>
                    )}
                </View>
            )}

            {/* ── 4. Top Overdue Residents (Rent Collection) ── */}
            {(hasPerm('dues') || hasPerm('finance')) && (data.totalBeds > 0 || data.totalRooms > 0) && (
                <View collapsable={false}>
                    <TopOverdueStudents data={data} />
                </View>
            )}

            {/* ── 5. Upcoming Dues ── */}
            {(hasPerm('dues') || hasPerm('finance')) && (data.totalBeds > 0 || data.totalRooms > 0) && (
                <View collapsable={false}>
                    <UpcomingDues data={data} renewalStudents={renewalStudents} />
                </View>
            )}

            {/* ── 6. Upcoming Checkout Schedules ── */}
            {(data.totalBeds > 0 || data.totalRooms > 0) && (
                <View collapsable={false}>
                    <UpcomingCheckoutSchedules data={data} />
                </View>
            )}

            {/* ── 7. Floor Availability Map ── */}
            {(data.totalBeds > 0 || data.totalRooms > 0) && (
                <OccupancyCard data={data} />
            )}
        </View>
    );
};

const s = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    topCell: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 6,
    },
    iconPill: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    topValue: {
        fontSize: 15,
        fontWeight: '900',
    },
    topLabel: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 1,
    },
    hDivider: {
        height: 1,
        marginVertical: 12,
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bottomCell: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    // Quick Actions
    quickActionsCard: {
        borderRadius: 16,
        paddingVertical: 12,
        borderWidth: 1,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    pageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 8,
    },
    actionBtn: {
        alignItems: 'center',
        width: 70,
    },
    actionIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    actionLabel: {
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
    },
    dotsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
    },
    dot: {
        height: 4,
        borderRadius: 2,
    },
});
