import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonList } from '../components/ui/SkeletonCard';
import { Bell, CreditCard, UserPlus, AlertTriangle, CheckCircle2, ChevronRight, MessageSquareCode, Calendar, X, User, FileText } from 'lucide-react-native';
import { useNotifications, Notification } from '../hooks/useNotifications';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { AnimatedGlowIcon } from '../components/ui/AnimatedGlowIcon';
import DateTimePickerModal from "react-native-modal-datetime-picker";

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
    const { notifications, loading, refreshNotifications, markAllAsRead, markAsRead } = useNotifications();
    const navigation = useNavigation<any>();
    const { theme, isDark } = useTheme();

    // Notification filtering states
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'payment' | 'admission' | 'room' | 'other'>('all');
    const [filterDate, setFilterDate] = useState<string | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
 
    const onRefresh = () => {
        refreshNotifications();
    };
 
    // Get animated icon for each notification category
    const getBadgeStyle = (notif: Notification) => {
        const title = notif.title.toLowerCase();
        
        if (title.includes('payment') || title.includes('collect') || notif.type === 'success') {
            return <AnimatedGlowIcon Icon={CheckCircle2} gradientColors={['#10B981', '#059669']} glowColor="#10B98133" containerSize={48} iconSize={22} />;
        } else if (title.includes('room') || title.includes('assign')) {
            return <AnimatedGlowIcon Icon={require('lucide-react-native').DoorOpen} gradientColors={['#F59E0B', '#D97706']} glowColor="#F59E0B33" containerSize={48} iconSize={22} />;
        } else if (title.includes('admission') || title.includes('tenant') || notif.type === 'info') {
            return <AnimatedGlowIcon Icon={User} gradientColors={['#3B82F6', '#2563EB']} glowColor="#3B82F633" containerSize={48} iconSize={22} />;
        } else if (title.includes('report') || title.includes('generated')) {
            return <AnimatedGlowIcon Icon={FileText} gradientColors={['#8B5CF6', '#6D28D9']} glowColor="#8B5CF633" containerSize={48} iconSize={22} />;
        } else {
            return <AnimatedGlowIcon Icon={Bell} gradientColors={['#F43F5E', '#BE123C']} glowColor="#F43F5E33" containerSize={48} iconSize={22} />;
        }
    };
 
    const handleNotifClick = (notif: Notification) => {
        markAsRead(notif.id);
 
        const data = notif.data;
        const title = (notif.title || '').toLowerCase();
        const type = notif.type;
 
        // Smart navigation based on payload structure and titles
        if (title.includes('payment') || title.includes('collect') || title.includes('fee')) {
            navigation.navigate('CollectedPayments');
        } else if (title.includes('due') || title.includes('pending')) {
            navigation.navigate('PendingPayments');
        } else if (title.includes('verify') || title.includes('verification')) {
            navigation.navigate('PaymentVerification');
        } else if (title.includes('notice') || title.includes('publish')) {
            navigation.navigate('Notices');
        } else if (title.includes('subscription') || title.includes('trial')) {
            navigation.navigate('SubscriptionExpired');
        } else if (title.includes('report')) {
            navigation.navigate('Reports');
        } else if (data?.student_id) {
            navigation.navigate('Notices');
        } else if (title.includes('maintenance') || title.includes('complaint')) {
            navigation.navigate('ComplaintsManagement');
        } else if (title.includes('room') || title.includes('assign')) {
            navigation.navigate('Rooms');
        } else if (title.includes('admission') || title.includes('tenant') || type === 'info') {
            if (data && (data.id || data.student_id)) {
                navigation.navigate('StudentDetails', { studentId: data.id || data.student_id });
            } else {
                navigation.navigate('Students');
            }
        } else if (type === 'warning' && title.includes('expense')) {
            navigation.navigate('Expenses');
        } else {
            navigation.navigate('Main', { screen: 'HomeTab' });
        }
    };

    // Filter notifications list
    const filteredNotifications = notifications.filter(n => {
        const titleLower = (n.title || '').toLowerCase();
        
        // Category match
        let matchesCategory = true;
        if (selectedCategory === 'payment') {
            matchesCategory = titleLower.includes('payment') || titleLower.includes('collect') || n.type === 'success';
        } else if (selectedCategory === 'admission') {
            const isRoom = titleLower.includes('room') || titleLower.includes('assign');
            matchesCategory = !isRoom && (titleLower.includes('admission') || titleLower.includes('tenant') || n.type === 'info');
        } else if (selectedCategory === 'room') {
            matchesCategory = titleLower.includes('room') || titleLower.includes('assign');
        } else if (selectedCategory === 'other') {
            const isPayment = titleLower.includes('payment') || titleLower.includes('collect') || n.type === 'success';
            const isRoom = titleLower.includes('room') || titleLower.includes('assign');
            const isAdmission = !isRoom && (titleLower.includes('admission') || titleLower.includes('tenant') || n.type === 'info');
            matchesCategory = !isPayment && !isAdmission && !isRoom;
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
                        {(['all', 'payment', 'admission', 'room', 'other'] as const).map((cat) => {
                            const isSelected = selectedCategory === cat;
                            const label = cat.charAt(0).toUpperCase() + cat.slice(1) + 's';
                            const displayLabel = cat === 'all' ? 'All' : cat === 'other' ? 'System' : label;
                            return (
                                <TouchableOpacity
                                    key={cat}
                                    style={[
                                        styles.categoryChip,
                                        { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' },
                                        isSelected && { backgroundColor: theme.primary }
                                    ]}
                                    onPress={() => setSelectedCategory(cat)}
                                >
                                    <Text style={[
                                        styles.categoryChipText,
                                        { color: isDark ? '#94A3B8' : '#64748B' },
                                        isSelected && { color: '#FFFFFF', fontWeight: '700' }
                                    ]}>
                                        {displayLabel}
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
                            const BadgeIcon = badge.Icon;
                            
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
