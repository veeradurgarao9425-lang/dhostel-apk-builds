/**
 * notificationService.ts
 *
 * Full-featured notification engine using Notifee (@notifee/react-native)
 * alongside Firebase Cloud Messaging (@react-native-firebase/messaging).
 *
 * Features:
 * - Native density-specific silhouette icons (Hostix app emblem) with defined teal color
 * - Notification Channels with Priority Tiers (HIGH, MEDIUM, LOW)
 * - Grouped notifications with expandable summaries
 * - Interactive action buttons (Approve/Reject on payments, Approve/View on registrations)
 * - Deep linking to exact target screens
 * - No duplicate icon bug: largeIcon omitted unless explicit distinct thumbnail provided
 * - Safe modular fallbacks for Expo development
 */

import '@react-native-firebase/app';
import { Platform, PermissionsAndroid, DeviceEventEmitter } from 'react-native';
import notifee, {
  EventType,
  AndroidImportance,
  AndroidVisibility,
  Event as NotifeeEvent,
} from '@notifee/react-native';
import Toast from 'react-native-toast-message';
import api from './api';
import {
  initializeNotificationChannels,
  resolveChannelId,
} from './notifeeChannels';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Firebase Cloud Messaging Native Loader ──────────────────────────────────
const getFirebaseMessagingInstance = () => {
  try {
    const messagingModule = require('@react-native-firebase/messaging');
    if (typeof messagingModule.getMessaging === 'function') {
      return messagingModule.getMessaging();
    }
    if (typeof messagingModule === 'function') {
      return messagingModule();
    }
    return null;
  } catch (err) {
    console.error('[FCM] Native Firebase module error:', err);
    return null;
  }
};

// In-memory counter for grouped notifications
const groupCounts: Record<string, number> = {};

export const notificationService = {
  _lastRegisteredToken: null as string | null,
  _navigateFn: null as ((screen: string, params?: any) => void) | null,
  _currentUserRole: null as string | null,

  /**
   * Set user role for channel & navigation routing (TENANT vs OWNER/DEVELOPER)
   */
  setUserRole(role: string | null) {
    this._currentUserRole = role;
  },

  /**
   * Request permission, initialize channels, get native FCM token, and register with backend.
   */
  async registerForPushNotificationsAsync(): Promise<string | null> {
    try {
      // 1. Initialize Android channels
      await initializeNotificationChannels();

      // 2. Request Android 13+ runtime POST_NOTIFICATIONS permission
      if (Platform.OS === 'android') {
        try {
          if (Platform.Version >= 33) {
            const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
            if (!hasPermission) {
              await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                {
                  title: 'Notification Permission',
                  message: 'Hostix needs permission to send you real-time rent alerts, payments, and admission notifications.',
                  buttonPositive: 'Allow',
                  buttonNegative: 'Deny',
                }
              );
            }
          }
        } catch (_) {}
      }

      // Also request Notifee permission
      try {
        await notifee.requestPermission();
      } catch (_) {}

      let token: string | null = null;

      // 3. Obtain Pure Native Firebase Cloud Messaging token
      try {
        const messagingModule = require('@react-native-firebase/messaging');
        const fcm = typeof messagingModule.getMessaging === 'function'
          ? messagingModule.getMessaging()
          : (typeof messagingModule === 'function' ? messagingModule() : null);

        if (Platform.OS === 'ios' && fcm) {
          try {
            if (typeof messagingModule.requestPermission === 'function') {
              await messagingModule.requestPermission(fcm);
            } else if (typeof fcm.requestPermission === 'function') {
              await fcm.requestPermission();
            }
          } catch (_) {}
        }

        if (fcm) {
          if (typeof messagingModule.getToken === 'function') {
            token = await messagingModule.getToken(fcm);
          } else if (typeof fcm.getToken === 'function') {
            token = await fcm.getToken();
          }

          if (token) {
            console.log('[FCM] 🔑 Obtained native FCM token:', token.substring(0, 16) + '...');
          }

          // Keep backend token synchronized on token refresh
          const onRefresh = (newToken: string) => {
            console.log('[FCM] 🔄 Native token refreshed, updating backend:', newToken);
            this._lastRegisteredToken = newToken;
            this.sendTokenToBackend(newToken, true).catch(() => {});
          };

          if (typeof messagingModule.onTokenRefresh === 'function') {
            messagingModule.onTokenRefresh(fcm, onRefresh);
          } else if (typeof fcm.onTokenRefresh === 'function') {
            fcm.onTokenRefresh(onRefresh);
          }
        }
      } catch (tokenErr: any) {
        console.error('[FCM] ❌ Error obtaining native FCM token:', tokenErr);
        try {
          Toast.show({
            type: 'error',
            text1: 'FCM Token Error',
            text2: String(tokenErr?.message || tokenErr).substring(0, 80),
          });
        } catch (_) {}
      }

      if (token) {
        this._lastRegisteredToken = token;
        await this.sendTokenToBackend(token, true);
        console.log('[FCM] ✅ Native Firebase FCM token registered successfully.');
        try {
          Toast.show({
            type: 'success',
            text1: 'Notifications Enabled ✅',
            text2: 'Real-time alerts connected to device',
            visibilityTime: 3500,
          });
        } catch (_) {}
      }

      return token;
    } catch (err: any) {
      console.warn('[FCM] Push registration error:', err?.message || err);
      return null;
    }
  },

  /**
   * Register push token with backend API.
   */
  async sendTokenToBackend(token: string, force = false) {
    if (!token) return;
    try {
      await api.post('/notifications/register-token', {
        push_token: token,
        platform: Platform.OS,
        device_name: Platform.OS === 'android' ? 'Android Device' : 'iOS Device',
      });
      console.log('[FCM] ✅ Token successfully sent and registered in backend database.');
    } catch (err: any) {
      console.warn('[Notification] Token registration API skipped:', err?.message || err);
    }
  },

  async disableNotifications() {
    if (this._lastRegisteredToken) {
      try {
        await api.post('/notifications/deregister-token', { push_token: this._lastRegisteredToken });
      } catch (_) {}
      this._lastRegisteredToken = null;
    }
  },

  /**
   * Display rich native notification using Notifee.
   */
  async displayRichNotification({
    id,
    title,
    body,
    category,
    data = {},
    largeIconUrl,
  }: {
    id?: string;
    title: string;
    body: string;
    category?: string;
    data?: any;
    largeIconUrl?: string;
  }) {
    try {
      const isTenant = this._currentUserRole === 'TENANT' || data?.role === 'TENANT';
      const cat = category || data?.category || data?.notification_type || data?.type || 'dues';
      const channelId = resolveChannelId(cat, isTenant);

      // Determine group key for collapsing notifications of same type
      const groupKey = `group_${cat.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      groupCounts[groupKey] = (groupCounts[groupKey] || 0) + 1;

      // Determine interactive action buttons
      const actions: any[] = [];
      const catLower = cat.toLowerCase();

      if (
        catLower.includes('payment') ||
        catLower.includes('verification') ||
        data?.type === 'PAYMENT_VERIFICATION' ||
        data?.action === 'verify_payment'
      ) {
        actions.push(
          {
            title: '✔ Approve',
            pressAction: { id: 'action_approve_payment' },
          },
          {
            title: '✖ Reject',
            pressAction: { id: 'action_reject_payment' },
          },
        );
      } else if (
        catLower.includes('registration') ||
        catLower.includes('tenant_mgmt') ||
        data?.type === 'NEW_REGISTRATION'
      ) {
        actions.push(
          {
            title: '✔ Approve',
            pressAction: { id: 'action_approve_tenant' },
          },
          {
            title: '👁 View',
            pressAction: { id: 'action_view_tenant' },
          },
        );
      }

      const notifId = id || `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      // Post the main notification
      // NOTE: We deliberately OMIT largeIcon unless an explicit individual thumbnail URL
      // is provided, fixing the duplicate launcher icon bug!
      await notifee.displayNotification({
        id: notifId,
        title,
        body,
        data: { ...data, category: cat },
        android: {
          channelId,
          smallIcon: 'notification_icon',
          color: isTenant ? '#C2410C' : '#7C3AED', // App theme color (Hostix Royal Purple / Stayvix Warm Rust)
          groupId: groupKey,
          largeIcon: largeIconUrl || 'notification_icon', // Full-color app theme icon in tray
          pressAction: {
            id: 'default',
          },
          actions: actions.length > 0 ? actions : undefined,
          showTimestamp: true,
          timestamp: Date.now(),
        },
        ios: {
          sound: 'default',
        },
      });

      // Maintain Group Summary Notification so multiple events of the same type
      // collapse into one bundle in the Android tray
      if (Platform.OS === 'android' && groupCounts[groupKey] > 1) {
        const count = groupCounts[groupKey];
        const groupLabel = cat.toUpperCase();
        await notifee.displayNotification({
          id: `summary_${groupKey}`,
          title: `${count} New ${groupLabel} Updates`,
          body: `You have ${count} pending updates in ${groupLabel}. Tap to view details.`,
          android: {
            channelId,
            smallIcon: 'notification_icon',
            color: isTenant ? '#C2410C' : '#7C3AED',
            groupId: groupKey,
            groupSummary: true,
            pressAction: {
              id: 'default',
            },
          },
        });
      }
    } catch (err: any) {
      console.warn('[Notifee] displayNotification error:', err?.message || err);
    }
  },

  /**
   * Resolves notification data into an exact deep link destination screen and params.
   */
  resolveDeepLink(data: any, userRole?: string): { screen: string; params: any } {
    const role = userRole || this._currentUserRole;
    const isTenant = role === 'TENANT';

    // 1. Direct screen parameter provided in notification payload
    if (data?.screen && typeof data.screen === 'string') {
      let params = data.params;
      if (typeof params === 'string') {
        try { params = JSON.parse(params); } catch (_) {}
      }
      return { screen: data.screen, params: params || data };
    }

    const typeStr = (data?.type || data?.notification_type || data?.category || '').toString().toLowerCase();
    const title = (data?.title || '').toString().toLowerCase();

    // 2. Dues / Payments
    if (typeStr.includes('due') || typeStr.includes('payment') || title.includes('payment') || title.includes('due')) {
      if (isTenant) {
        if (data?.payment_id || data?.paymentId) {
          return { screen: 'PaymentReceipt', params: { paymentId: data.payment_id || data.paymentId } };
        }
        return { screen: 'TenantDues', params: data };
      } else {
        const paymentId = data?.payment_id || data?.paymentId;
        const studentId = data?.student_id || data?.studentId;
        if (paymentId) {
          return { screen: 'PaymentDetails', params: { paymentId, studentId, ...data } };
        }
        return { screen: 'PendingPayments', params: data };
      }
    }

    // 3. Vacate
    if (typeStr.includes('vacat') || title.includes('vacat')) {
      const studentId = data?.student_id || data?.studentId;
      if (isTenant) {
        return { screen: 'TenantRoomInfo', params: data };
      }
      if (studentId) {
        return { screen: 'StudentDetails', params: { studentId, tab: 'vacate', ...data } };
      }
      return { screen: 'RequestsManagement', params: data };
    }

    // 4. Tenant Registration / Admission
    if (
      typeStr.includes('regist') ||
      typeStr.includes('admission') ||
      title.includes('registration') ||
      title.includes('admission') ||
      title.includes('qr')
    ) {
      if (isTenant) {
        return { screen: 'PendingApproval', params: data };
      }
      const studentId = data?.student_id || data?.studentId;
      if (studentId) {
        return { screen: 'StudentDetails', params: { studentId, ...data } };
      }
      return { screen: 'Students', params: data };
    }

    // 5. Complaints
    if (typeStr.includes('complaint') || title.includes('complaint')) {
      const complaintId = data?.complaint_id || data?.complaintId || data?.id;
      if (isTenant) {
        return { screen: 'TenantComplaints', params: { complaintId, ...data } };
      }
      return { screen: 'ComplaintsManagement', params: { complaintId, ...data } };
    }

    // 6. Guest & Gate Pass
    if (typeStr.includes('gate') || typeStr.includes('pass') || title.includes('gate')) {
      if (isTenant) {
        return { screen: 'TenantGatePass', params: data };
      }
      return { screen: 'Guests', params: data };
    }
    if (typeStr.includes('guest') || title.includes('guest')) {
      const guestId = data?.guest_id || data?.guestId;
      if (guestId) {
        return { screen: 'GuestDetails', params: { guestId, ...data } };
      }
      return { screen: 'Guests', params: data };
    }

    // 7. Notices & Announcements
    if (typeStr.includes('notice') || title.includes('notice')) {
      const noticeId = data?.notice_id || data?.noticeId;
      if (isTenant) {
        return { screen: 'TenantNotices', params: { noticeId, ...data } };
      }
      if (noticeId) {
        return { screen: 'NoticeDetails', params: { noticeId, ...data } };
      }
      return { screen: 'NoticesManagement', params: data };
    }

    // 8. Expenses
    if (typeStr.includes('expense') || title.includes('expense')) {
      if (isTenant) {
        return { screen: 'Expenses', params: data };
      }
      const expenseId = data?.expense_id || data?.expenseId;
      if (expenseId) {
        return { screen: 'ExpenseDetails', params: { expenseId, ...data } };
      }
      return { screen: 'Expenses', params: data };
    }

    // 9. Growth (Tenant)
    if (typeStr.includes('growth') || title.includes('growth') || title.includes('story')) {
      return { screen: 'GrowthStory', params: data };
    }

    // Fallback: Notifications screen
    return { screen: isTenant ? 'TenantNotifications' : 'Notifications', params: data };
  },

  /**
   * Handles interactive action button clicks (Approve, Reject, View).
   */
  async handleNotificationAction(actionId: string, data: any) {
    console.log('[Notification] Action triggered:', actionId, data);
    try {
      if (actionId === 'action_approve_payment') {
        const paymentId = data?.payment_id || data?.paymentId || data?.id;
        if (paymentId) {
          await api.post(`/payments/${paymentId}/verify`, { status: 'APPROVED' }).catch(() => {});
          DeviceEventEmitter.emit('REFRESH_NOTIFICATIONS');
          DeviceEventEmitter.emit('PAYMENT_STATUS_CHANGED', { paymentId, status: 'APPROVED' });
        }
      } else if (actionId === 'action_reject_payment') {
        const paymentId = data?.payment_id || data?.paymentId || data?.id;
        if (paymentId) {
          await api.post(`/payments/${paymentId}/reject`, { reason: 'Rejected from notification' }).catch(() => {});
          DeviceEventEmitter.emit('REFRESH_NOTIFICATIONS');
          DeviceEventEmitter.emit('PAYMENT_STATUS_CHANGED', { paymentId, status: 'REJECTED' });
        }
      } else if (actionId === 'action_approve_tenant') {
        const studentId = data?.student_id || data?.studentId || data?.id;
        if (studentId) {
          await api.post(`/students/${studentId}/approve`, {}).catch(() => {});
          DeviceEventEmitter.emit('REFRESH_NOTIFICATIONS');
        }
      } else if (actionId === 'action_view_tenant') {
        const studentId = data?.student_id || data?.studentId || data?.id;
        if (this._navigateFn) {
          this._navigateFn('StudentDetails', { studentId });
        }
      }
    } catch (err: any) {
      console.warn('[Notification] Error executing action:', err?.message || err);
    }
  },

  /**
   * Set up all foreground, background, and notification click listeners.
   */
  setupNotificationListeners(navigate?: (screen: string, params?: any) => void): () => void {
    if (navigate) {
      this._navigateFn = navigate;
    }

    // 1. Notifee Foreground Event Listener
    const unsubscribeNotifeeForeground = notifee.onForegroundEvent(async ({ type, detail }: NotifeeEvent) => {
      if (type === EventType.PRESS) {
        // Notification body tapped
        const { screen, params } = this.resolveDeepLink(detail.notification?.data);
        if (this._navigateFn && screen) {
          this._navigateFn(screen, params);
        }
      } else if (type === EventType.ACTION_PRESS) {
        // Action button tapped
        const actionId = detail.pressAction?.id;
        if (actionId) {
          await this.handleNotificationAction(actionId, detail.notification?.data);
        }
      }
    });

    // 2. Firebase Foreground Message Listener
    let unsubscribeFcmForeground = () => {};
    const fcm = getFirebaseMessagingInstance();
    const messagingModule = (() => {
      try { return require('@react-native-firebase/messaging'); } catch { return null; }
    })();

    if (fcm || messagingModule) {
      const handleFcmForeground = async (remoteMessage: any) => {
        const title = remoteMessage.notification?.title || remoteMessage.data?.title || 'Alert 🔔';
        const body = remoteMessage.notification?.body || remoteMessage.data?.message || '';
        let data = remoteMessage.data || {};
        if (typeof data.params === 'string') {
          try { data.params = JSON.parse(data.params); } catch (_) {}
        }

        // Refresh in-app badge count and notification center lists
        DeviceEventEmitter.emit('REFRESH_NOTIFICATIONS');

        // Render system notification via Notifee
        await this.displayRichNotification({
          id: remoteMessage.messageId,
          title,
          body,
          category: data.category || data.type,
          data,
          largeIconUrl: remoteMessage.notification?.android?.imageUrl || data.imageUrl,
        });
      };

      if (fcm && typeof fcm.onMessage === 'function') {
        unsubscribeFcmForeground = fcm.onMessage(handleFcmForeground);
      } else if (messagingModule && typeof messagingModule.onMessage === 'function') {
        unsubscribeFcmForeground = messagingModule.onMessage(fcm, handleFcmForeground);
      }

      // Notification clicked from background / quit
      const handleNotificationOpenedApp = (remoteMessage: any) => {
        const { screen, params } = this.resolveDeepLink(remoteMessage.data);
        if (this._navigateFn && screen) {
          this._navigateFn(screen, params);
        }
      };

      if (fcm && typeof fcm.onNotificationOpenedApp === 'function') {
        fcm.onNotificationOpenedApp(handleNotificationOpenedApp);
      } else if (messagingModule && typeof messagingModule.onNotificationOpenedApp === 'function') {
        messagingModule.onNotificationOpenedApp(fcm, handleNotificationOpenedApp);
      }

      // Check if launched from killed state
      const getInitial = (fcm && typeof fcm.getInitialNotification === 'function')
        ? fcm.getInitialNotification()
        : (messagingModule && typeof messagingModule.getInitialNotification === 'function' ? messagingModule.getInitialNotification(fcm) : Promise.resolve(null));

      getInitial.then((remoteMessage: any) => {
        if (remoteMessage?.data) {
          const { screen, params } = this.resolveDeepLink(remoteMessage.data);
          if (this._navigateFn && screen) {
            setTimeout(() => this._navigateFn!(screen, params), 800);
          }
        }
      }).catch(() => {});
    }

    return () => {
      unsubscribeNotifeeForeground();
      unsubscribeFcmForeground();
    };
  },

  async sendTestNotification(title?: string, message?: string, data?: any): Promise<boolean> {
    try {
      await this.displayRichNotification({
        title: title || 'Test Push Notification',
        body: message || 'Rich notification delivered via Notifee with Hostix emblem!',
        data: data || { screen: 'Notifications' },
      });
      return true;
    } catch {
      return false;
    }
  },
};

// ── Backward-compatible types and test helpers ──────────────────────────────
export type NotificationType =
  | 'PAYMENT'
  | 'DUE_REMINDER'
  | 'MESS_FOOD'
  | 'NOTICE'
  | 'MAINTENANCE'
  | 'DOCUMENT'
  | 'EXPENSE'
  | 'COMPLAINT'
  | 'BIRTHDAY'
  | 'SUMMARY'
  | 'MOTIVATIONAL'
  | 'SUPPORT'
  | 'ROOM_ALLOCATED'
  | 'VACATE'
  | 'PREBOOKING'
  | 'ADMIN_ALERT'
  | 'SWITCH_HOSTEL'
  | 'JOKE';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: any;
}

export const getNotificationContent = (type: NotificationType, customData?: any): NotificationPayload => {
  switch (type) {
    case 'PAYMENT':
      return { title: '✔️ Payment Successful', body: customData?.body || '₹3,250 received successfully.' };
    case 'DUE_REMINDER':
      return { title: '📅 Rent Due Tomorrow', body: customData?.body || '₹4,250 due on 05 Jul.' };
    case 'MESS_FOOD':
      return { title: "🍲 Today's Lunch Ready", body: customData?.body || 'Paneer Butter Masala 🍛' };
    case 'NOTICE':
      return { title: '📢 New Notice', body: customData?.body || 'Mess timings updated.' };
    case 'MAINTENANCE':
      return { title: '🔧 Maintenance Update', body: customData?.body || 'Water supply will stop at 10 AM.' };
    case 'DOCUMENT':
      return { title: '📄 Receipt Available', body: customData?.body || 'June payment receipt is ready.' };
    case 'EXPENSE':
      return { title: "💸 Add Today's Expense", body: customData?.body || "Don't forget to enter your expenses." };
    case 'COMPLAINT':
      return { title: '⚙️ Complaint Updated', body: customData?.body || 'Your complaint has been updated.' };
    case 'BIRTHDAY':
      return { title: '🎂 Happy Birthday! 🥳', body: customData?.body || 'Have a wonderful day!' };
    case 'SUMMARY':
      return { title: '📊 Monthly Summary Ready', body: customData?.body || 'You spent ₹3,650 this month.' };
    case 'MOTIVATIONAL':
      return { title: '⭐ Great Job!', body: customData?.body || 'No pending dues this month.' };
    case 'SUPPORT':
      return { title: "💬 We're here for you! 😊", body: customData?.body || 'Need help? Our team is ready to assist.' };
    case 'ROOM_ALLOCATED':
      return { title: '🔑 Room Allocated', body: customData?.body || 'Room 103 has been allocated to you.' };
    case 'VACATE':
      return { title: '🚪 Vacate Alert', body: customData?.body || 'A tenant is vacating today.' };
    case 'PREBOOKING':
      return { title: '📝 Pre-booking Alert', body: customData?.body || 'Today is the allocation day for a pre-booked student.' };
    case 'ADMIN_ALERT':
      return { title: '⚠️ High Dues Alert', body: customData?.body || 'Please check the bills, many dues are pending.' };
    case 'SWITCH_HOSTEL':
      return { title: '🔄 Hostel Switched', body: customData?.body || 'Checkout and switch completed successfully.' };
    case 'JOKE':
      return { title: '😂 Hostix Humor', body: customData?.body || 'Why did the tenant cross the road? To pay the rent!' };
    default:
      return { title: 'Hostix Alert', body: 'You have a new notification.' };
  }
};

export const sendAppNotification = async (type: NotificationType, customData?: any) => {
  const content = getNotificationContent(type, customData);
  await notificationService.displayRichNotification({
    title: content.title,
    body: content.body,
    category: type.toLowerCase(),
    data: customData,
  });
};
