import React, { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter, AppState, AppStateStatus } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../services/notificationService';

const envUrl = process.env.EXPO_PUBLIC_API_URL as string | undefined;
const BASE_URL = (envUrl && !envUrl.includes('192.168.')) ? envUrl : 'https://dark-dew-bf62.veeradurgarao840.workers.dev/api';
const SOCKET_URL = (envUrl && !envUrl.includes('192.168.')) ? envUrl.replace('/api', '') : 'https://api.143-244-131-69.sslip.io';

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  useEffect(() => {
    let socket: Socket | null = null;

    const connect = async () => {
      const uid = user?.user_id || (user as any)?.id;
      if (!uid) return;
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      socket = io(SOCKET_URL, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
      });

      const handleEvent = (
        payload: any = {},
        defaultTitle = 'Hostix Alert 🔔',
        defaultMessage = '',
        category = 'dues',
      ) => {
        const title = payload?.title || defaultTitle;
        const message = payload?.message || payload?.body || defaultMessage;
        const cat = payload?.category || payload?.type || category;

        // 1. Refresh in-app badges and lists
        DeviceEventEmitter.emit('REFRESH_NOTIFICATIONS', payload);

        // 2. Real-time floating in-app banner
        DeviceEventEmitter.emit('IN_APP_NOTIFICATION', {
          title,
          message,
          category: cat,
          data: payload,
        });

        // 3. Native system notification via Notifee
        notificationService.displayRichNotification({
          id: payload?.id ? `socket_${payload.id}` : undefined,
          title,
          body: message,
          category: cat,
          data: payload,
        }).catch(() => {});
      };

      // Dues & Payments
      socket.on('new_payment', (p) =>
        handleEvent(p, 'Payment Recorded ✅', `Payment of ₹${p?.amount || ''} received.`, 'dues'),
      );
      socket.on('payment_recorded', (p) =>
        handleEvent(p, 'Payment Received ✅', `Rent payment of ₹${p?.amount || ''} was recorded.`, 'dues'),
      );
      socket.on('payment_proof_uploaded', (p) =>
        handleEvent(p, 'Payment Proof Uploaded 📄', 'A tenant submitted payment proof for verification.', 'dues'),
      );
      socket.on('payment_verified', (p) => {
        DeviceEventEmitter.emit('PAYMENT_STATUS_CHANGED', { ...p, status: 'APPROVED' });
        handleEvent(p, 'Payment Verified ✔', 'Your rent payment has been verified by the owner.', 'dues');
      });
      socket.on('payment_rejected', (p) => {
        DeviceEventEmitter.emit('PAYMENT_STATUS_CHANGED', { ...p, status: 'REJECTED' });
        handleEvent(p, 'Payment Rejected ✖', p?.reason || 'Your payment proof was rejected.', 'dues');
      });
      socket.on('dues_status_changed', (p) =>
        handleEvent(p, 'Dues Update 📅', p?.message || 'Your dues status was updated.', 'dues'),
      );

      // Vacate
      socket.on('vacate_request', (p) => {
        DeviceEventEmitter.emit('VACATE_STATUS_CHANGED', p);
        handleEvent(p, 'Vacate Request 🚪', 'A tenant submitted a vacate request.', 'vacate');
      });
      socket.on('vacate_status_changed', (p) => {
        DeviceEventEmitter.emit('VACATE_STATUS_CHANGED', p);
        handleEvent(p, 'Vacate Status Updated 🚪', p?.message || 'Vacate request status has changed.', 'vacate');
      });

      // Complaints
      socket.on('new_complaint', (p) => {
        DeviceEventEmitter.emit('COMPLAINT_STATUS_CHANGED', p);
        handleEvent(p, 'New Complaint Registered 🔧', p?.title || 'A new maintenance request was submitted.', 'complaints');
      });
      socket.on('complaint_updated', (p) => {
        DeviceEventEmitter.emit('COMPLAINT_STATUS_CHANGED', p);
        handleEvent(p, 'Complaint Updated 🔧', p?.message || 'Maintenance complaint status has been updated.', 'complaints');
      });

      // Registrations
      socket.on('new_registration', (p) =>
        handleEvent(p, 'New Registration 👤', 'A new tenant has registered and awaits approval.', 'tenant_mgmt'),
      );
      socket.on('registration_approved', (p) =>
        handleEvent(p, 'Registration Approved 🎉', 'Your registration has been approved. Welcome to the hostel!', 'account'),
      );

      // Generic
      socket.on('new_notification', (p) => handleEvent(p, 'New Notification 🔔', p?.message || '', p?.category || 'dues'));
      socket.on('REFRESH_NOTIFICATIONS', (p) => handleEvent(p, 'Hostix Update 🔔', p?.message || '', 'dues'));
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
  }, [user?.user_id || (user as any)?.id]);

  return <>{children}</>;
};
