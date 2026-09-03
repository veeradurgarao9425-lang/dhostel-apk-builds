import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonList } from '../components/ui/SkeletonCard';
import { Bell, AlertTriangle, CheckCircle2, ChevronRight, Calendar, X, User, FileText, Banknote } from 'lucide-react-native';
import { useNotifications, Notification } from '../hooks/useNotifications';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { AnimatedGlowIcon } from '../components/ui/AnimatedGlowIcon';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { notificationService } from '../services/notificationService';

// Helper function to format timestamp into friendly relative time
const formatRelativeTime = (dateStr: string) => {
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        
        if (diffMs < 0) return 'Just now'; // Handle minor clock offsets
        
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMs / 3600000);
 
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHrs < 24) {
            // Check if same calendar day
            if (date.getDate() === now.getDate()) {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else {
                return 'Yesterday';
            }
        }
        
        // Yesterday check
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (
            date.getDate() === yesterday.getDate() && 
            date.getMonth() === yesterday.getMonth() && 
            date.getFullYear() === yesterday.getFullYear()
        ) {
            return 'Yesterday';
        }
 
        // Return short date format like "22 Jun"
        return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
    } catch {
        return '';
    }
};
 
export const NotificationScreen = () => {
    const { user } = useAuth();
    const { notifications, loading, refreshNotifications, markAllAsRead, markAsRead } = useNotifications();
    const navigation = useNavigation<any>();
    const { theme, isDark } = useTheme();

    // Notification filtering states
    const [selectedCategory, setSelectedCategory] = useState<
        'all' | 'dues' | 'tenant_mgmt' | 'vacate' | 'complaints' | 'guest' | 'staff' | 'expenses' | 'reports'
    >('all');
    const [filterDate, setFilterDate] = useState<string | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
 
    const onRefresh = () => {
        refreshNotifications();
    };
 
    // Get animated icon for each notification category
    const getBadgeStyle = (notif: Notification) => {
        const title = notif.title.toLowerCase();
        const data = notif.data || {};
        const notifType = (data.type || data.notification_type || '').toString().toLowerCase();

        // Payment received / collected / proof — Banknote icon (green)
        if (
            title.includes('payment') ||
            title.includes('collect') ||
            title.includes('proof') ||
            title.includes('receipt') ||
            notif.type === 'success' ||
            notifType.includes('payment')
        ) {
            return <AnimatedGlowIcon Icon={Banknote} gradientColors={['#10B981', '#059669']} glowColor="#10B98133" containerSize={48} iconSize={22} />;
        }
        // Overdue / pending dues — AlertTriangle icon (red)
        if (
            title.includes('due') ||
            title.includes('overdue') ||
            title.includes('pending') ||
            title.includes('reminder') ||
            notif.type === 'warning'
        ) {
            return <AnimatedGlowIcon Icon={AlertTriangle} gradientColors={['#EF4444', '#DC2626']} glowColor="#EF444433" containerSize={48} iconSize={22} />;
        }
        // Room / bed / allocation — DoorOpen icon (amber)
        if (title.includes('room') || title.includes('bed') || title.includes('assign') || title.includes('allocat')) {
            return <AnimatedGlowIcon Icon={require('lucide-react-native').DoorOpen} gradientColors={['#F59E0B', '#D97706']} glowColor="#F59E0B33" containerSize={48} iconSize={22} />;
        }
        // Vacate — DoorOpen icon (orange)
        if (title.includes('vacat')) {
            return <AnimatedGlowIcon Icon={require('lucide-react-native').DoorOpen} gradientColors={['#F97316', '#EA580C']} glowColor="#F9731633" containerSize={48} iconSize={22} />;
        }
        // Admission / new student / registration
        if (title.includes('admission') || title.includes('registration') || title.includes('enrolled') || title.includes('tenant') || notif.type === 'info') {
            return <AnimatedGlowIcon Icon={User} gradientColors={['#3B82F6', '#2563EB']} glowColor="#3B82F633" containerSize={48} iconSize={22} />;
        }
        // Notice / report / document
        if (title.includes('notice') || title.includes('report') || title.includes('summary') || title.includes('generated') || title.includes('document')) {
            return <AnimatedGlowIcon Icon={FileText} gradientColors={['#8B5CF6', '#6D28D9']} glowColor="#8B5CF633" containerSize={48} iconSize={22} />;
        }
        // General / system fallback
        return <AnimatedGlowIcon Icon={Bell} gradientColors={['#F43F5E', '#BE123C']} glowColor="#F43F5E33" containerSize={48} iconSize={22} />;
    };
 
    const handleNotifClick = (notif: Notification) => {
        markAsRead(notif.id);

        const data = notif.data || {};
        const title = (notif.title || '').toLowerCase();
        const type = notif.type;
        const notifType = (data.type || data.notification_type || '').toString().toUpperCase();
        const isTenant = user?.role_id === 3 || user?.role === 'TENANT';

        try {
            // ── TENANT routing ────────────────────────────────────────────────
            if (isTenant) {
                // 1. Direct screen from backend payload (highest priority)
                if (data.screen && typeof data.screen === 'string') {
                    let params = data.params;
                    if (typeof params === 'string') {
                        try { params = JSON.parse(params); } catch {}
                    }
                    navigation.navigate(data.screen, params || {});
                    return;
                }
                // 2. Title-based fallback for tenant
                if (title.includes('payment') || title.includes('collect') || title.includes('fee') || title.includes('receipt')) {
                    navigation.navigate('Payments');
                } else if (title.includes('due') || title.includes('overdue') || title.includes('reminder')) {
                    navigation.navigate('Dues');
                } else if (title.includes('complaint') || title.includes('maintenance')) {
                    navigation.navigate('Complaints');
                } else if (title.includes('notice')) {
                    navigation.navigate('Notices');
                } else if (title.includes('feedback') || notifType === 'FEEDBACK_REQUEST' || data.action === 'OPEN_FEEDBACK') {
                    navigation.navigate('Feedback');
                } else if (title.includes('room') || title.includes('bed') || title.includes('allocat')) {
                    navigation.navigate('RoomInfo');
                } else {
                    navigation.navigate('Main');
                }
                return;
            }

            // ── OWNER routing ─────────────────────────────────────────────────

            // 1. Direct screen from backend payload (highest priority — backend already
            //    embeds screen + params for payment, vacate, admission notifications)
            if (data.screen && typeof data.screen === 'string') {
                let params = data.params;
                if (typeof params === 'string') {
                    try { params = JSON.parse(params); } catch {}
                }
                // Normalise params: ensure we have the right shape
                const mergedParams = params || {};
                navigation.navigate(data.screen, mergedParams);
                return;
            }

            // 2. Helper: resolve student ID from all possible keys in data
            const resolveStudentId = () =>
                data.student_id || data.studentId || data.id ||
                (data.params && (data.params.studentId || data.params.student_id)) ||
                data.reference_id || data.referenceId;

            const resolveStudentName = () =>
                data.student_name || data.studentName ||
                (data.params && (data.params.studentName || data.params.student_name));

            // 3. Payment received / collected / proof → TenantTransactions (exact student)
            if (
                title.includes('payment') ||
                title.includes('collect') ||
                title.includes('proof') ||
                title.includes('receipt')
            ) {
                const sid = resolveStudentId();
                if (sid) {
                    navigation.navigate('TenantTransactions', {
                        studentId: sid,
                        studentName: resolveStudentName(),
                    });
                } else {
                    navigation.navigate('CollectedPayments');
                }
                return;
            }

            // 4. Overdue / due reminder → StudentDetails payments tab (or PendingPayments)
            if (
                title.includes('due') ||
                title.includes('pending') ||
                title.includes('overdue') ||
                title.includes('reminder')
            ) {
                const sid = resolveStudentId();
                if (sid) {
                    navigation.navigate('StudentDetails', {
                        studentId: sid,
                        activeTab: 'payments',
                    });
                } else {
                    navigation.navigate('PendingPayments');
                }
                return;
            }

            // 5. Vacate notice → StudentDetails (or Students list)
            if (title.includes('vacat')) {
                const sid = resolveStudentId();
                if (sid) {
                    navigation.navigate('StudentDetails', { studentId: sid });
                } else {
                    navigation.navigate('Students');
                }
                return;
            }

            // 6. New Admission / QR Registration → Students (pending tab if available)
            if (
                title.includes('admission') ||
                title.includes('registration') ||
                title.includes('pre-booking') ||
                title.includes('qr') ||
                title.includes('enrolled') ||
                title.includes('awaiting')
            ) {
                navigation.navigate('Students');
                return;
            }

            // 7. Room / bed events → Rooms
            if (title.includes('room') || title.includes('bed') || title.includes('assign') || title.includes('allocat')) {
                const sid = resolveStudentId();
                if (sid) {
                    navigation.navigate('StudentDetails', { studentId: sid });
                } else {
                    navigation.navigate('Rooms');
                }
                return;
            }

            // 8. Remaining specific types
            if (title.includes('verify') || title.includes('verification')) {
                navigation.navigate('PaymentVerification');
            } else if (title.includes('notice') || title.includes('publish')) {
                navigation.navigate('Notices');
            } else if (title.includes('subscription') || title.includes('trial') || title.includes('expired')) {
                navigation.navigate('SubscriptionExpired');
            } else if (title.includes('report') || title.includes('summary')) {
                navigation.navigate('Reports');
            } else if (title.includes('maintenance') || title.includes('complaint')) {
                navigation.navigate('ComplaintsManagement');
            } else if (title.includes('feedback') || notifType === 'FEEDBACK_REQUEST' || data.action === 'OPEN_FEEDBACK') {
                navigation.navigate('Feedback');
            } else if (type === 'warning' && title.includes('expense')) {
                navigation.navigate('Expenses');
            } else {
                // Safe fallback — 'Dashboard' route does not exist; use 'Main'
                navigation.navigate('Notifications');
            }
        } catch (navErr) {
            console.error('Notification navigation error:', navErr);
        }
    };

    // Filter notifications list
    const filteredNotifications = notifications.filter(n => {
        const titleLower = (n.title || '').toLowerCase();
        const data = n.data || {};
        const cat = (data.category || data.notification_type || data.type || '').toString().toLowerCase();

        // Category match
        let matchesCategory = true;
        if (selectedCategory === 'dues') {
            matchesCategory = titleLower.includes('payment') || titleLower.includes('due') || titleLower.includes('rent') || titleLower.includes('collect') || cat.includes('due') || cat.includes('payment') || n.type === 'success';
        } else if (selectedCategory === 'tenant_mgmt') {
            matchesCategory = titleLower.includes('admission') || titleLower.includes('registration') || titleLower.includes('student') || titleLower.includes('tenant') || cat.includes('regist') || n.type === 'info';
        } else if (selectedCategory === 'vacate') {
            matchesCategory = titleLower.includes('vacat') || cat.includes('vacat');
        } else if (selectedCategory === 'complaints') {
            matchesCategory = titleLower.includes('complaint') || titleLower.includes('maint') || cat.includes('complaint');
        } else if (selectedCategory === 'guest') {
            matchesCategory = titleLower.includes('guest') || titleLower.includes('visitor') || cat.includes('guest');
        } else if (selectedCategory === 'staff') {
            matchesCategory = titleLower.includes('staff') || titleLower.includes('salary') || cat.includes('staff');
        } else if (selectedCategory === 'expenses') {
            matchesCategory = titleLower.includes('expense') || cat.includes('expense');
        } else if (selectedCategory === 'reports') {
            matchesCategory = titleLower.includes('report') || titleLower.includes('summary') || cat.includes('report');
        }

        // Date match
        let matchesDate = true;
        if (filterDate) {
            try {
                const notifDateStr = new Date(n.date).toISOString().split('T')[0];
                matchesDate = notifDateStr === filterDate;
            } catch {
                matchesDate = false;
            }
        }

        return matchesCategory && matchesDate;
    });
 
    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
            <Header
                title="Notifications"
                subtitle="Stay updated with activities & rent collections"
                showProfile={false}
                rightElement={
                    <View style={styles.headerRightContainer}>
                        <TouchableOpacity 
                            style={[
                                styles.headerDateFilterBtn, 
                                filterDate ? { backgroundColor: 'rgba(255, 255, 255, 0.25)', borderColor: '#FFFFFF', borderWidth: 1 } : null
                            ]} 
                            onPress={() => setShowDatePicker(true)}
                            activeOpacity={0.8}
                        >
                            <Calendar size={16} color="#FFFFFF" />
                            {filterDate && (
                                <TouchableOpacity onPress={(e) => { e.stopPropagation(); setFilterDate(null); }} style={{ marginLeft: 4 }}>
                                    <X size={12} color="#FFFFFF" />
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>

                        {notifications.some(n => !n.read) && (
                            <TouchableOpacity onPress={markAllAsRead} style={styles.markReadButton}>
                                <CheckCircle2 size={14} color="#FFF" />
                                <Text style={styles.markReadText}>Mark Read</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
            />

            {/* Filters Bar with category chips */}
            <View style={[styles.filterBar, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    <View style={styles.categoryContainer}>
                        {([
                            { id: 'all', label: 'All' },
                            { id: 'dues', label: 'Dues' },
                            { id: 'tenant_mgmt', label: 'Tenant Mgmt' },
                            { id: 'vacate', label: 'Vacate' },
                            { id: 'complaints', label: 'Complaints' },
                            { id: 'guest', label: 'Guest' },
                            { id: 'staff', label: 'Staff' },
                            { id: 'expenses', label: 'Expenses' },
                            { id: 'reports', label: 'Reports' },
                        ] as const).map((cat) => {
                            const isSelected = selectedCategory === cat.id;
                            return (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryChip,
                                        { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' },
                                        isSelected && { backgroundColor: theme.primary }
                                    ]}
                                    onPress={() => setSelectedCategory(cat.id as any)}
                                >
                                    <Text style={[
                                        styles.categoryChipText,
                                        { color: isDark ? '#94A3B8' : '#64748B' },
                                        isSelected && { color: '#FFFFFF', fontWeight: '700' }
                                    ]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>

            {loading && notifications.length === 0 ? (
                <SkeletonList count={6} />
            ) : (
                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={theme.primary} />}
                >
                    <View style={{ height: 10 }} />
                    {filteredNotifications.length === 0 ? (
                        <EmptyState illustration="notice"
                            title="No Notifications Found"
                            subtitle={notifications.length === 0 ? "No new notifications. We'll let you know when important updates arrive." : "No notifications match the selected category or date filter."}
                        />
                    ) : (
                        filteredNotifications.map((notif) => {
                            const badge = getBadgeStyle(notif);
                            
                            return (
                                <TouchableOpacity 
                                    key={notif.id} 
                                    onPress={() => handleNotifClick(notif)} 
                                    activeOpacity={0.7}
                                    style={[styles.itemContainer, { borderBottomColor: isDark ? '#334155' : '#F1F5F9', backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }, !notif.read && { backgroundColor: isDark ? '#1E293B' : '#FAFAFA' }]}
                                >
                                    <View style={styles.row}>
                                        {/* Premium Left Icon Badge */}
                                        <View style={styles.iconContainerAnimated}>
                                            {getBadgeStyle(notif)}
                                        </View>
                                        
                                        {/* Middle content section */}
                                        <View style={styles.textContainer}>
                                            <View style={styles.headerRow}>
                                                <Text 
                                                    style={[styles.notifTitle, !notif.read && styles.unreadTitle, { color: isDark ? '#E2E8F0' : '#0F172A' }]} 
                                                    numberOfLines={1}
                                                >
                                                    {notif.title}
                                                </Text>
                                            </View>
                                            <Text 
                                                style={[styles.notifMessage, !notif.read && styles.unreadMessage, { color: isDark ? '#94A3B8' : '#475569' }]} 
                                                numberOfLines={2}
                                            >
                                                {notif.body}
                                            </Text>
                                            <Text style={styles.notifTime}>{formatRelativeTime(notif.date)}</Text>
                                        </View>
 
                                        {/* Right Indicator (Blue unread dot or chevron) */}
                                        <View style={styles.rightIndicatorContainer}>
                                            {!notif.read ? (
                                                <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
                                            ) : (
                                                <ChevronRight size={16} color="#CBD5E1" />
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                    <View style={styles.bottomSpacing} />
                </ScrollView>
            )}

            <DateTimePickerModal 
                isVisible={showDatePicker} 
                mode="date" 
                date={filterDate ? new Date(filterDate) : new Date()} 
                onConfirm={(d: Date) => { setShowDatePicker(false); setFilterDate(d.toISOString().split('T')[0]); }} 
                onCancel={() => setShowDatePicker(false)} 
            />
        </View>
    );
};
 
const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, paddingVertical: 10 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    // Header right controls
    headerRightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerDateFilterBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginRight: 8,
    },

    // Filter bar styles
    filterBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    categoryScroll: {
        flex: 1,
    },
    categoryContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    categoryChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
    },
    categoryChipText: {
        fontSize: 12,
        fontWeight: '600',
    },

    itemContainer: {
        paddingVertical: 20,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    unreadItem: {
        backgroundColor: '#FAFAFA', 
    },
    row: { flexDirection: 'row', alignItems: 'center', width: '100%' },
    iconContainerAnimated: {
        marginRight: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: { flex: 1, marginRight: 8 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
    notifTitle: { fontSize: 15, fontWeight: '700' },
    unreadTitle: { fontWeight: '800' },
    notifMessage: { fontSize: 13, lineHeight: 20, fontWeight: '400', marginBottom: 8 },
    unreadMessage: { fontWeight: '500' },
    notifTime: { fontSize: 12, color: '#64748B', fontWeight: '500' },
    rightIndicatorContainer: {
        width: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    markReadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    markReadText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
        marginLeft: 4,
    },
    bottomSpacing: { height: 60 },
});

export default NotificationScreen;
