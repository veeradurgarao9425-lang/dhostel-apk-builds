import React, { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter, AppState, AppStateStatus } from 'react-native';
import { useAuth } from './AuthContext';

const envUrl = process.env.EXPO_PUBLIC_API_URL as string | undefined;
const BASE_URL = (envUrl && !envUrl.includes('192.168.')) ? envUrl : 'https://dark-dew-bf62.veeradurgarao840.workers.dev/api';
const SOCKET_URL = (envUrl && !envUrl.includes('192.168.')) ? envUrl.replace('/api', '') : 'https://api.143-244-131-69.sslip.io';

/**
 * A general-purpose socket connection (separate from ChatContext, which only
 * connects once a tenant has an allocated room). This one connects for ANY
 * logged-in tenant — including pending/status=3 registrations — so events
 * like "registration approved"/"payment verified"/"complaint updated" reach
 * the app live instead of only via push notification.
 *
 * Bridges every relevant socket event onto the same DeviceEventEmitter
 * channel ('REFRESH_NOTIFICATIONS') the app already uses for push-driven
 * refresh (see HomeScreen.tsx, NotificationsScreen.tsx) — so no consumer
 * screen needs to change.
 */
export const NotificationSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  useEffect(() => {
    let socket: Socket | null = null;

    const connect = async () => {
      if (!user?.id) return;
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      socket = io(SOCKET_URL, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
      });

      const refresh = () => DeviceEventEmitter.emit('REFRESH_NOTIFICATIONS');

      socket.on('payment_verified', refresh);
      socket.on('complaint_updated', refresh);
      socket.on('REFRESH_NOTIFICATIONS', refresh);
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
  }, [user?.id]);

  return <>{children}</>;
};
