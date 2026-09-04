import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { getLocalReadIds, saveLocalReadIds } from '../Pages/tenant/NotificationsScreen';

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
            const [response, localReadSet] = await Promise.all([
                api.get('/notifications?limit=30'),
                getLocalReadIds(),
            ]);

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

                    const isRead = item.is_read === 1 || item.is_read === true || localReadSet.has(String(item.notification_id));

                    return {
                        id: item.notification_id,
                        type,
                        title: item.title || 'Notification',
                        body: item.message || '',
                        time: new Date(item.created_at).toLocaleString(),
                        date: item.created_at,
                        read: isRead,
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
            lastNotifsFetchTime = Date.now();
            if (__DEV__) {
                console.log('Notice fetching notifications (offline or pending deploy):', (error as any)?.message);
            }
        } finally {
            inflightNotifsPromise = null;
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();

        // Listen for internal events to sync across components
        const eventSubscription = require('react-native').DeviceEventEmitter.addListener('REFRESH_NOTIFICATIONS', () => {
            fetchNotifications();
        });

        return () => {
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

            await saveLocalReadIds([id]);

            // Sync with backend
            api.put(`/notifications/${id}/read`).catch(() => {});
            require('react-native').DeviceEventEmitter.emit('REFRESH_NOTIFICATIONS');
        } catch (error) {
            console.error(`Error marking notification ${id} as read:`, error);
        }
    };

    const markAllAsRead = async () => {
      try {
          // Optimistic UI update
          const allIds = globalNotifsCache.map(n => n.id);
          const updated = globalNotifsCache.map(n => ({ ...n, read: true }));
          globalNotifsCache = updated;
          globalUnreadCount = 0;
          setNotifications(updated);
          setUnreadCount(0);

          await saveLocalReadIds(allIds);

          // Sync with backend
          api.put('/notifications/read-all').catch(() => {});
          allIds.forEach(id => {
            api.put(`/notifications/${id}/read`).catch(() => {});
          });
          require('react-native').DeviceEventEmitter.emit('REFRESH_NOTIFICATIONS');
      } catch (error) {
          console.error('Error marking all notifications as read:', error);
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
