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

let globalNotifsCache: Notification[] = [];
let globalUnreadCount = 0;
let lastNotifsFetchTime = 0;
let inflightNotifsPromise: Promise<any> | null = null;

export const useNotifications = () => {
    const [notifications, setNotifications] = useState<Notification[]>(globalNotifsCache);
    const [unreadCount, setUnreadCount] = useState(globalUnreadCount);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = useCallback(async (force = false) => {
        const now = Date.now();
        if (!force && now - lastNotifsFetchTime < 20000 && globalNotifsCache.length > 0) {
            setNotifications(globalNotifsCache);
            setUnreadCount(globalUnreadCount);
            return;
        }

        if (inflightNotifsPromise) {
            try {
                await inflightNotifsPromise;
                setNotifications(globalNotifsCache);
                setUnreadCount(globalUnreadCount);
                return;
            } catch {}
        }

        try {
            setLoading(true);
            inflightNotifsPromise = api.get('/notifications?limit=30');
            const response = await inflightNotifsPromise;

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
                            student_id: item.student_id || (extraData as any)?.student_id || (extraData as any)?.studentId || (parsedParams as any)?.studentId,
                            studentId: item.student_id || (extraData as any)?.student_id || (extraData as any)?.studentId || (parsedParams as any)?.studentId,
                            student_name: item.student_name || (extraData as any)?.student_name || (extraData as any)?.studentName || (parsedParams as any)?.studentName,
                            studentName: item.student_name || (extraData as any)?.student_name || (extraData as any)?.studentName || (parsedParams as any)?.studentName
                        }
                    };
                });

                globalNotifsCache = formattedNotifications;
                const unread = formattedNotifications.filter(n => !n.read).length;
                globalUnreadCount = unread;
                lastNotifsFetchTime = Date.now();

                setNotifications(formattedNotifications);
                setUnreadCount(unread);
            }
        } catch (error) {
            console.error('Error fetching notifications from API:', error);
        } finally {
            inflightNotifsPromise = null;
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
            const updated = globalNotifsCache.map(n => n.id === id ? { ...n, read: true } : n);
            globalNotifsCache = updated;
            const unread = Math.max(0, globalUnreadCount - 1);
            globalUnreadCount = unread;
            setNotifications(updated);
            setUnreadCount(unread);

            // Sync with backend
            await api.put(`/notifications/${id}/read`);
            require('react-native').DeviceEventEmitter.emit('REFRESH_NOTIFICATIONS');
        } catch (error) {
            console.error(`Error marking notification ${id} as read:`, error);
            // Revert changes on error by refetching
            fetchNotifications(true);
        }
    };

    const markAllAsRead = async () => {
      try {
          // Optimistic UI update
          const updated = globalNotifsCache.map(n => ({ ...n, read: true }));
          globalNotifsCache = updated;
          globalUnreadCount = 0;
          setNotifications(updated);
          setUnreadCount(0);

          // Sync with backend
          await api.put('/notifications/read-all');
          require('react-native').DeviceEventEmitter.emit('REFRESH_NOTIFICATIONS');
      } catch (error) {
          console.error('Error marking all notifications as read:', error);
          fetchNotifications(true);
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
