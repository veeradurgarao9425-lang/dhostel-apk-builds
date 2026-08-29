import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Linking,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
    UserPlus,
    CreditCard,
    ShieldCheck,
    BedDouble,
    Utensils,
    AlertCircle,
    Megaphone,
    FolderOpen,
    Phone,
    MessageCircle,
    CheckCircle2,
    Users,
    Building,
    ArrowRight,
    TrendingUp,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface StaffDashboardViewProps {
    data: any;
    theme: any;
    isDark: boolean;
    navigation: any;
    user: any;
}

export const StaffDashboardView = ({
    data,
    theme,
    isDark,
    navigation,
    user,
}: StaffDashboardViewProps) => {
    // Parse permissions from user object
    const permissions = React.useMemo(() => {
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

    const hasAccess = (moduleKey: string) => {
        const val = permissions[moduleKey];
        return val === 'manage' || val === 'view' || val === true || val === '1';
    };

    // Calculate occupancy rate
    const totalBeds = Number(data?.totalBeds || 0);
    const occupiedBeds = Number(data?.occupiedBeds || 0);
    const availableBeds = Number(data?.availableBeds || Math.max(totalBeds - occupiedBeds, 0));
    const occupancyPercentage = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    // Quick Actions filtered strictly by permissions
    const quickActions = React.useMemo(() => {
        const actions = [];

        if (hasAccess('students') || hasAccess('tenants')) {
            actions.push({
                id: 'add_student',
                label: 'Add Tenant',
                sub: 'Register new resident',
                icon: UserPlus,
                color: '#7C3AED',
                bg: '#EDE9FE',
                onPress: () => navigation.navigate('AddStudent'),
            });
        }

        if (hasAccess('dues') || hasAccess('finance')) {
            actions.push({
                id: 'collect_rent',
                label: 'Collect Rent',
                sub: 'Record cash payment',
                icon: CreditCard,
                color: '#059669',
                bg: '#D1FAE5',
                onPress: () => navigation.navigate('CollectedPayments'),
            });
        }

        if (hasAccess('verify_rent')) {
            actions.push({
                id: 'verify_rent',
                label: 'Verify Rent',
                sub: 'Check online proofs',
                icon: ShieldCheck,
                color: '#2563EB',
                bg: '#DBEAFE',
                onPress: () => navigation.navigate('PaymentVerification'),
            });
        }

        if (hasAccess('rooms')) {
            actions.push({
                id: 'rooms',
                label: 'Rooms & Beds',
                sub: `${availableBeds} beds available`,
                icon: BedDouble,
                color: '#0284C7',
                bg: '#E0F2FE',
                onPress: () => navigation.navigate('Rooms'),
            });
        }

        actions.push({
            id: 'docs_hub',
            label: 'KYC & Files',
            sub: 'Tenant ID proofs',
            icon: FolderOpen,
            color: '#9333EA',
            bg: '#F3E8FF',
            onPress: () => navigation.navigate('DocumentsHub'),
        });

        if (hasAccess('complaints')) {
            actions.push({
                id: 'complaints',
                label: 'Complaints',
                sub: `${data?.openComplaintsCount || 0} open tickets`,
                icon: AlertCircle,
                color: '#DC2626',
                bg: '#FEE2E2',
                onPress: () => navigation.navigate('ComplaintsManagement'),
            });
        }

        if (hasAccess('mess')) {
            actions.push({
                id: 'mess',
                label: 'Mess Menu',
                sub: 'Weekly food schedule',
                icon: Utensils,
                color: '#EA580C',
                bg: '#FFEDD5',
                onPress: () => navigation.navigate('MessMenuManagement'),
            });
        }

        if (hasAccess('notices')) {
            actions.push({
                id: 'notices',
                label: 'Notices Board',
                sub: 'Broadcast alerts',
                icon: Megaphone,
                color: '#4F46E5',
                bg: '#EEF2FF',
                onPress: () => navigation.navigate('NoticesManagement'),
            });
        }

        return actions;
    }, [permissions, availableBeds, data?.openComplaintsCount, navigation]);

    const sendWhatsAppReminder = (phone: string, name: string, dueAmount: number) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/\D/g, '');
        const message = `Hello ${name}, this is a reminder from ${data?.hostelName || 'Hostel Management'} regarding your pending rent due of ₹${dueAmount.toLocaleString('en-IN')}. Kindly pay at your earliest convenience. Thank you!`;
        Linking.openURL(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`).catch(() => {});
    };

    return (
        <View style={styles.container}>
            {/* ── Welcome & Property Card ── */}
            <LinearGradient
                colors={['#4F46E5', '#3730A3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
            >
                <View style={styles.heroTopRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.greetingSub}>Hostel Operations Portal</Text>
                        <Text style={styles.staffGreeting}>
                            Hello, {user?.full_name || 'Staff Member'} 👋
                        </Text>
                    </View>
                    <View style={styles.roleBadgeWrap}>
                        <Text style={styles.roleBadgeText}>STAFF</Text>
                    </View>
                </View>

                <View style={styles.propertyInfoBar}>
                    <Building size={14} color="#C7D2FE" />
                    <Text style={styles.propertyNameText} numberOfLines={1}>
                        {data?.hostelName || 'Assigned Hostel'}
                    </Text>
                </View>
            </LinearGradient>

            {/* ── Operational Occupancy & Bed Statistics ── */}
            <View style={styles.metricsContainer}>
                <Text style={styles.sectionHeading}>ROOM & OCCUPANCY STATUS</Text>

                <View style={styles.metricsGrid}>
                    {/* Occupancy Rate Box */}
                    <View style={[styles.metricCard, { borderLeftColor: '#4F46E5', borderLeftWidth: 4 }]}>
                        <View style={styles.metricIconWrap}>
                            <TrendingUp size={16} color="#4F46E5" />
                        </View>
                        <Text style={styles.metricValue}>{occupancyPercentage}%</Text>
                        <Text style={styles.metricLabel}>Occupancy Rate</Text>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${Math.min(occupancyPercentage, 100)}%` }]} />
                        </View>
                    </View>

                    {/* Occupied Beds Box */}
                    <View style={[styles.metricCard, { borderLeftColor: '#059669', borderLeftWidth: 4 }]}>
                        <View style={[styles.metricIconWrap, { backgroundColor: '#ECFDF5' }]}>
                            <Users size={16} color="#059669" />
                        </View>
                        <Text style={[styles.metricValue, { color: '#059669' }]}>
                            {occupiedBeds} <Text style={styles.metricSubValue}>/ {totalBeds}</Text>
                        </Text>
                        <Text style={styles.metricLabel}>Occupied Beds</Text>
                    </View>

                    {/* Vacant Beds Box */}
                    <View style={[styles.metricCard, { borderLeftColor: '#0284C7', borderLeftWidth: 4 }]}>
                        <View style={[styles.metricIconWrap, { backgroundColor: '#E0F2FE' }]}>
                            <BedDouble size={16} color="#0284C7" />
                        </View>
                        <Text style={[styles.metricValue, { color: '#0284C7' }]}>{availableBeds}</Text>
                        <Text style={styles.metricLabel}>Vacant Beds Available</Text>
                    </View>

                    {/* Pending Dues Box */}
                    {(hasAccess('dues') || hasAccess('finance')) && (
                        <View style={[styles.metricCard, { borderLeftColor: '#E11D48', borderLeftWidth: 4 }]}>
                            <View style={[styles.metricIconWrap, { backgroundColor: '#FFE4E6' }]}>
                                <CreditCard size={16} color="#E11D48" />
                            </View>
                            <Text style={[styles.metricValue, { color: '#E11D48' }]}>
                                ₹{(data?.totalDuesAmount || data?.pendingAmount || 0).toLocaleString('en-IN')}
                            </Text>
                            <Text style={styles.metricLabel}>Pending Rent Dues</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* ── Operational Quick Actions ── */}
            <View style={styles.sectionWrap}>
                <Text style={styles.sectionHeading}>OPERATIONAL ACTIONS</Text>
                <View style={styles.quickActionsGrid}>
                    {quickActions.map(action => {
                        const IconComponent = action.icon;
                        return (
                            <TouchableOpacity
                                key={action.id}
                                style={styles.actionCard}
                                onPress={action.onPress}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.actionIconBox, { backgroundColor: action.bg }]}>
                                    <IconComponent size={22} color={action.color} />
                                </View>
                                <Text style={styles.actionTitle} numberOfLines={1}>
                                    {action.label}
                                </Text>
                                <Text style={styles.actionSubtitle} numberOfLines={1}>
                                    {action.sub}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* ── Pending Rent Collection Section ── */}
            {(hasAccess('dues') || hasAccess('finance')) && data?.unpaidStudents && data.unpaidStudents.length > 0 && (
                <View style={styles.sectionWrap}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionHeading}>PENDING RENT COLLECTION</Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('PendingTab')}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                        >
                            <Text style={styles.viewAllLink}>View All ({data.unpaidStudents.length})</Text>
                            <ArrowRight size={13} color="#4F46E5" />
                        </TouchableOpacity>
                    </View>

                    {data.unpaidStudents.slice(0, 5).map((student: any, idx: number) => {
                        const dueAmt = Number(student.due_amount || student.pending_amount || student.monthly_rent || 0);
                        return (
                            <View key={student.student_id || idx} style={styles.overdueCard}>
                                <View style={styles.overdueHeaderRow}>
                                    <View style={styles.studentAvatarBox}>
                                        <Text style={styles.avatarLetter}>
                                            {(student.full_name || student.name || 'R')[0].toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <Text style={styles.overdueName} numberOfLines={1}>
                                            {student.full_name || student.name || 'Resident'}
                                        </Text>
                                        <Text style={styles.overdueRoom}>
                                            Room {student.room_number || 'N/A'} {student.bed_number ? `• Bed ${student.bed_number}` : ''}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.overdueAmount}>
                                            ₹{dueAmt.toLocaleString('en-IN')}
                                        </Text>
                                        <Text style={styles.overdueLabel}>Pending</Text>
                                    </View>
                                </View>

                                {/* Action Buttons */}
                                <View style={styles.cardActionsRow}>
                                    <TouchableOpacity
                                        style={styles.collectActionBtn}
                                        onPress={() => {
                                            navigation.navigate('CollectedPayments', {
                                                studentId: student.student_id,
                                                studentName: student.full_name || student.name,
                                                suggestedAmount: dueAmt,
                                            });
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <CreditCard size={13} color="#FFFFFF" />
                                        <Text style={styles.collectActionBtnText}>Collect Rent</Text>
                                    </TouchableOpacity>

                                    {student.phone ? (
                                        <TouchableOpacity
                                            style={styles.reminderActionBtn}
                                            onPress={() => sendWhatsAppReminder(student.phone, student.full_name || student.name, dueAmt)}
                                            activeOpacity={0.8}
                                        >
                                            <MessageCircle size={13} color="#059669" />
                                            <Text style={styles.reminderActionBtnText}>Remind</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}

            {/* ── Active Notices & Announcements ── */}
            {data?.latestNotice && (
                <View style={styles.sectionWrap}>
                    <Text style={styles.sectionHeading}>LATEST NOTICE</Text>
                    <View style={styles.noticeCard}>
                        <View style={styles.noticeIconWrap}>
                            <Megaphone size={18} color="#4F46E5" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.noticeTitle}>{data.latestNotice.title}</Text>
                            <Text style={styles.noticeContent} numberOfLines={2}>
                                {data.latestNotice.content}
                            </Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 24,
    },
    heroCard: {
        borderRadius: 20,
        padding: 18,
        marginBottom: 18,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 4,
    },
    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    greetingSub: {
        fontSize: 12,
        fontWeight: '600',
        color: '#C7D2FE',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    staffGreeting: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFFFFF',
        marginTop: 2,
    },
    roleBadgeWrap: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    roleBadgeText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    propertyInfoBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        marginTop: 14,
    },
    propertyNameText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
        flex: 1,
    },

    // Metrics
    metricsContainer: {
        marginBottom: 20,
    },
    sectionHeading: {
        fontSize: 12,
        fontWeight: '800',
        color: '#64748B',
        letterSpacing: 0.6,
        marginBottom: 10,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    metricCard: {
        width: (width - 42) / 2,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    metricIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    metricValue: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
    },
    metricSubValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    metricLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 2,
    },
    progressBarBg: {
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        marginTop: 6,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#4F46E5',
        borderRadius: 2,
    },

    // Quick Actions
    sectionWrap: {
        marginBottom: 20,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    viewAllLink: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4F46E5',
    },
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    actionCard: {
        width: (width - 42) / 2,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        alignItems: 'flex-start',
    },
    actionIconBox: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    actionTitle: {
        fontSize: 13.5,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 2,
    },
    actionSubtitle: {
        fontSize: 11,
        fontWeight: '500',
        color: '#64748B',
    },

    // Overdue Card
    overdueCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    overdueHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    studentAvatarBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarLetter: {
        fontSize: 15,
        fontWeight: '800',
        color: '#4F46E5',
    },
    overdueName: {
        fontSize: 13.5,
        fontWeight: '800',
        color: '#0F172A',
    },
    overdueRoom: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 1,
    },
    overdueAmount: {
        fontSize: 14,
        fontWeight: '900',
        color: '#DC2626',
    },
    overdueLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#DC2626',
    },
    cardActionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    collectActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        backgroundColor: '#059669',
        paddingVertical: 7,
        borderRadius: 8,
    },
    collectActionBtnText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    reminderActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    reminderActionBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#059669',
    },

    // Notice Card
    noticeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    noticeIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    noticeTitle: {
        fontSize: 13.5,
        fontWeight: '800',
        color: '#0F172A',
    },
    noticeContent: {
        fontSize: 11.5,
        color: '#64748B',
        marginTop: 2,
        lineHeight: 16,
    },
});
