import React, { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter, AppState, AppStateStatus } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../contexts/AuthContext';

const envUrl = process.env.EXPO_PUBLIC_API_URL as string | undefined;
const BASE_URL = (envUrl && !envUrl.includes('192.168.')) ? envUrl : 'https://dark-dew-bf62.veeradurgarao840.workers.dev/api';
const SOCKET_URL = (envUrl && !envUrl.includes('192.168.')) ? envUrl.replace('/api', '') : 'https://api.143-244-131-69.sslip.io';

const getExpoNotifications = () => {
  try {
    return require('expo-notifications');
  } catch {
    return null;
  }
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  useEffect(() => {
    let socket: Socket | null = null;

    const connect = async () => {
      if (!user?.user_id) return;
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      socket = io(SOCKET_URL, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
      });

      const handleEvent = (payload?: any, defaultTitle = 'Hostix Alert 🔔', defaultMessage = '') => {
        DeviceEventEmitter.emit('REFRESH_NOTIFICATIONS', payload);

        const title = payload?.title || defaultTitle;
        const message = payload?.message || payload?.body || defaultMessage;

        if (title || message) {
          try {
            const Notifications = getExpoNotifications();
            if (Notifications && typeof Notifications.scheduleNotificationAsync === 'function') {
              Notifications.scheduleNotificationAsync({
                content: {
                  title,
                  body: message,
                  sound: 'default',
                  data: payload || {},
                },
                trigger: null,
              }).catch(() => {});
            }
          } catch (_) {}
        }
      };

      socket.on('new_notification', (p) => handleEvent(p, 'New Notification 🔔'));
      socket.on('new_payment', (p) => handleEvent(p, 'Payment Recorded ✅', `Payment of ₹${p?.amount || ''} received.`));
      socket.on('payment_recorded', (p) => handleEvent(p, 'Payment Received ✅', `Rent payment of ₹${p?.amount || ''} was recorded.`));
      socket.on('payment_proof_uploaded', (p) => handleEvent(p, 'Payment Proof Uploaded 📄', 'A tenant submitted payment proof for verification.'));
      socket.on('new_complaint', (p) => handleEvent(p, 'New Complaint Registered 🔧', 'A new maintenance request has been submitted.'));
      socket.on('REFRESH_NOTIFICATIONS', (p) => handleEvent(p, 'Hostix Update 🔔'));
    };

    connect();

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active' && socket && !socket.connected) {
        socket.connect();
      }
    });

    return () => {
      sub.remove();
      if (socket) socket.disconnect();
    };
  }, [user?.user_id]);

  return <>{children}</>;
};
