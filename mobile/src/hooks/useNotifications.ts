import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export type Notification = {
    id: string | number;
    type: 'payment' | 'admission' | 'expense' | 'income' | 'info' | 'warning' | 'success';
    title: string;
    body: string;
    time: string;
    read: boolean;
    data?: any;
    date: string; // original date for sorting
};

export const useNotifications = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/notifications?limit=30');

            if (response.data.success) {
                const dbNotifs = response.data.data;
                const formattedNotifications: Notification[] = dbNotifs.map((item: any) => {
                    let type: Notification['type'] = 'info';
                    
                    // Map backend notification_type to frontend type
                    if (item.notification_type === 'Payment Due') {
                        type = 'warning';
                    } else if (item.notification_type === 'New Admission') {
                        type = 'info';
                    } else if (item.notification_type === 'Expense Alert') {
                        type = 'warning';
                    } else if (item.notification_type === 'System Alert') {
                        type = 'info';
                    } else if (item.notification_type === 'General') {
                        if (item.title.toLowerCase().includes('payment') || item.title.toLowerCase().includes('collect')) {
                            type = 'success';
                        } else {
                            type = 'info';
                        }
                    }

                    let extraData = {};
                    if (item.metadata) {
                        try {
                            extraData = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
                        } catch {}
                    }
                    let parsedParams = item.params;
                    if (typeof parsedParams === 'string') {
                        try {
                            parsedParams = JSON.parse(parsedParams);
                        } catch {}
                    }

                    return {
                        id: item.notification_id,
                        type,
                        title: item.title || 'Notification',
                        body: item.message || '',
                        time: new Date(item.created_at).toLocaleString(),
                        date: item.created_at,
                        read: item.is_read === 1,
                        data: {
                            ...item,
                            ...extraData,
                            params: parsedParams,
                            student_id: item.student_id || extraData?.student_id || extraData?.studentId || (parsedParams && parsedParams.studentId),
                            studentId: item.student_id || extraData?.student_id || extraData?.studentId || (parsedParams && parsedParams.studentId),
                            student_name: item.student_name || extraData?.student_name || extraData?.studentName || (parsedParams && parsedParams.studentName),
                            studentName: item.student_name || extraData?.student_name || extraData?.studentName || (parsedParams && parsedParams.studentName)
                        }
                    };
                });

                setNotifications(formattedNotifications);
                
                // Count unread
                const unread = formattedNotifications.filter(n => !n.read).length;
                setUnreadCount(unread);
            }
        } catch (error) {
            console.error('Error fetching notifications from API:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();

        // Listen for foreground notifications to auto-refresh the count and list
        let subscription: any;
        try {
            const Notifications = require('expo-notifications');
            if (Notifications && Notifications.addNotificationReceivedListener) {
                subscription = Notifications.addNotificationReceivedListener(() => {
                    fetchNotifications();
                });
            }
        } catch (e) {
            // Non-fatal fallback for Expo Go
        }

        // Listen for internal events to sync across components
        const eventSubscription = require('react-native').DeviceEventEmitter.addListener('REFRESH_NOTIFICATIONS', () => {
            fetchNotifications();
        });

        return () => {
            subscription?.remove?.();
            eventSubscription.remove();
        };
    }, [fetchNotifications]);

    const markAsRead = async (id: string | number) => {
        try {
            // Optimistic UI update
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));

            // Sync with backend
            await api.put(`/notifications/${id}/read`);
            require('react-native').DeviceEventEmitter.emit('REFRESH_NOTIFICATIONS');
        } catch (error) {
            console.error(`Error marking notification ${id} as read:`, error);
            // Revert changes on error by refetching
            fetchNotifications();
        }
    };

    const markAllAsRead = async () => {
      try {
          // Optimistic UI update
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
          setUnreadCount(0);

          // Sync with backend
          await api.put('/notifications/read-all');
          require('react-native').DeviceEventEmitter.emit('REFRESH_NOTIFICATIONS');
      } catch (error) {
          console.error('Error marking all notifications as read:', error);
          fetchNotifications();
      }
    };

    return {
        notifications,
        unreadCount,
        loading,
        refreshNotifications: fetchNotifications,
        markAsRead,
        markAllAsRead
    };
};
