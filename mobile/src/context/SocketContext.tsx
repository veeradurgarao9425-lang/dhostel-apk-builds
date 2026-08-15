import React, { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter, AppState, AppStateStatus } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

const envUrl = process.env.EXPO_PUBLIC_API_URL as string | undefined;
const BASE_URL = (envUrl && !envUrl.includes('192.168.')) ? envUrl : 'http://143.244.131.69:8081/api';
const SOCKET_URL = BASE_URL.replace('/api', '');

/**
 * The owner app never opened a socket connection before — new_payment,
 * payment_proof_uploaded, and new_complaint were emitted by the backend to
 * hostel_${id} but nobody was listening. The server auto-joins the socket
 * to hostel_${hostel_id} from the JWT (see backend/src/socket/index.ts), so
 * this just needs to connect and bridge events onto the same
 * DeviceEventEmitter channel ('REFRESH_NOTIFICATIONS') that
 * useNotifications.ts already listens on for push-driven refresh.
 */
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

      const refresh = () => DeviceEventEmitter.emit('REFRESH_NOTIFICATIONS');

      socket.on('new_payment', refresh);
      socket.on('payment_proof_uploaded', refresh);
      socket.on('new_complaint', refresh);
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
  }, [user?.user_id]);

  return <>{children}</>;
};
