import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Bell, CreditCard, UserPlus, AlertTriangle, CheckCircle2, ChevronRight, MessageSquareCode } from 'lucide-react-native';
import { useNotifications, Notification } from '../hooks/useNotifications';
import { useNavigation } from '@react-navigation/native';

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

    const onRefresh = () => {
        refreshNotifications();
    };

    // Get color theme for each notification category
    const getBadgeStyle = (notif: Notification) => {
        const title = notif.title.toLowerCase();
        
        if (title.includes('payment') || title.includes('collect') || notif.type === 'success') {
            return {
                bgColor: '#E6F4EA', // Emerald tint
                iconColor: '#137333',
                Icon: CheckCircle2
            };
        } else if (title.includes('admission') || title.includes('tenant') || notif.type === 'info') {
            return {
                bgColor: '#E8F0FE', // Google Blue tint
                iconColor: '#1A73E8',
                Icon: UserPlus
            };
        } else if (title.includes('notice') || title.includes('publish')) {
            return {
                bgColor: '#F3E8FF', // Purple tint
                iconColor: '#7C3AED',
                Icon: Bell
            };
        } else if (title.includes('expense') || title.includes('due') || notif.type === 'warning') {
            return {
                bgColor: '#FCE8E6', // Red/Amber tint
                iconColor: '#C5221F',
                Icon: AlertTriangle
            };
        }
        
        return {
            bgColor: '#F1F3F4',
            iconColor: '#5F6368',
            Icon: Bell
        };
    };

    const handleNotifClick = (notif: Notification) => {
        markAsRead(notif.id);

        const data = notif.data;
        const title = notif.title.toLowerCase();
        const type = notif.type;

        // Smart navigation based on payload structure and titles
        if (title.includes('payment') || title.includes('collect') || type === 'success') {
            navigation.navigate('FinanceTab', { mode: 'Rent' });
        } else if (title.includes('admission') || title.includes('tenant') || type === 'info') {
            if (data && (data.id || data.student_id)) {
                navigation.navigate('StudentDetails', { studentId: data.id || data.student_id });
            } else {
                navigation.navigate('Students');
            }
        } else if (title.includes('room') || title.includes('created')) {
            navigation.navigate('OverviewTab');
        } else if (title.includes('notice') || title.includes('publish')) {
            navigation.navigate('Notices');
        } else if (type === 'warning' && title.includes('expense')) {
            navigation.navigate('FinanceTab', { mode: 'Expense' });
        } else {
            navigation.navigate('HomeTab');
        }
    };

    return (
        <View style={styles.container}>
            <Header
                title="Notifications"
                rightElement={
                    notifications.some(n => !n.read) ? (
                        <TouchableOpacity onPress={markAllAsRead} style={styles.markReadButton}>
                            <Text style={styles.markReadText}>Mark all read</Text>
                        </TouchableOpacity>
                    ) : null
                }
            />
            {loading && notifications.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#FF6B6B" />
                </View>
            ) : (
                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#FF6B6B" />}
                >
                    {notifications.length === 0 ? (
                        <EmptyState
                            variant="noData"
                            title="All caught up!"
                            subtitle="No new notifications. We'll let you know when important updates arrive."
                        />
                    ) : (
                        notifications.map((notif) => {
                            const badge = getBadgeStyle(notif);
                            const BadgeIcon = badge.Icon;
                            
                            return (
                                <TouchableOpacity 
                                    key={notif.id} 
                                    onPress={() => handleNotifClick(notif)} 
                                    activeOpacity={0.7}
                                    style={[styles.itemContainer, !notif.read && styles.unreadItem]}
                                >
                                    <View style={styles.row}>
                                        {/* Premium Left Icon Badge */}
                                        <View style={[styles.iconContainer, { backgroundColor: badge.bgColor }]}>
                                            <BadgeIcon size={20} color={badge.iconColor} />
                                        </View>
                                        
                                        {/* Middle content section */}
                                        <View style={styles.textContainer}>
                                            <View style={styles.headerRow}>
                                                <Text 
                                                    style={[styles.notifTitle, !notif.read && styles.unreadTitle]} 
                                                    numberOfLines={1}
                                                >
                                                    {notif.title}
                                                </Text>
                                                <Text style={styles.notifTime}>{formatRelativeTime(notif.date)}</Text>
                                            </View>
                                            <Text 
                                                style={[styles.notifMessage, !notif.read && styles.unreadMessage]} 
                                                numberOfLines={2}
                                            >
                                                {notif.body}
                                            </Text>
                                        </View>

                                        {/* Right Indicator (Blue unread dot or chevron) */}
                                        <View style={styles.rightIndicatorContainer}>
                                            {!notif.read ? (
                                                <View style={styles.unreadDot} />
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    content: { flex: 1, paddingVertical: 10 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    itemContainer: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 16,
        paddingHorizontal: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        flexDirection: 'row',
        alignItems: 'center'
    },
    unreadItem: {
        backgroundColor: '#F0F7FF', // Soft modern blue tint for unread items
    },
    row: { flexDirection: 'row', alignItems: 'center', width: '100%' },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22, // Round circle
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14
    },
    textContainer: { flex: 1, marginRight: 8 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
    notifTitle: { fontSize: 14, fontWeight: '500', color: '#64748B' },
    unreadTitle: { fontWeight: '700', color: '#1E293B' },
    notifTime: { fontSize: 11, color: '#94A3B8', fontWeight: '400', marginLeft: 8 },
    notifMessage: { fontSize: 13, color: '#64748B', lineHeight: 18, fontWeight: '400' },
    unreadMessage: { color: '#334155', fontWeight: '500' },
    rightIndicatorContainer: {
        width: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3B82F6', // iOS/Slack style blue unread dot
    },
    markReadButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    markReadText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600'
    },
    bottomSpacing: { height: 60 },
});

export default NotificationScreen;
