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

                    return {
                        id: item.notification_id,
                        type,
                        title: item.title,
                        body: item.message,
                        time: new Date(item.created_at).toLocaleString(),
                        date: item.created_at,
                        read: item.is_read === 1,
                        data: item
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
    }, [fetchNotifications]);

    const markAsRead = async (id: string | number) => {
        try {
            // Optimistic UI update
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));

            // Sync with backend
            await api.put(`/notifications/${id}/read`);
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
