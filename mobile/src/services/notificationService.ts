/**
 * notificationService.ts
 * Pure Firebase Cloud Messaging (FCM) via @react-native-firebase/messaging modular API.
 * Safely guards native module access in local Expo dev environments.
 */
import { Platform, PermissionsAndroid, NativeModules } from 'react-native';
import api from './api';

const getFirebaseMessagingModule = () => {
  try {
    const hasNativeFirebase = !!(
      NativeModules?.RNFBAppModule ||
      NativeModules?.RNFBMessagingModule ||
      (typeof (global as any)?.__turboModuleProxy === 'function' && (global as any)?.__turboModuleProxy('NativeRNFBTurboApp'))
    );
    if (!hasNativeFirebase) {
      return null;
    }
    return require('@react-native-firebase/messaging');
  } catch {
    return null;
  }
};

export const notificationService = {
  _lastRegisteredToken: null as string | null,

  /**
   * Request permission (Android 13+ requires runtime POST_NOTIFICATIONS),
   * get the FCM token, and send it to our backend.
   */
  async registerForPushNotificationsAsync(): Promise<string | null> {
    try {
      // ── Android 13+ runtime permission ─────────────────────────────
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
          if (result !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn('[FCM] ❌ POST_NOTIFICATIONS permission denied.');
            return null;
          }
        }
      }

      const fcm = getFirebaseMessagingModule();
      if (!fcm) {
        // Native Firebase module is not linked in current dev binary (active after native build)
        return null;
      }

      const { getMessaging, requestPermission, getToken, AuthorizationStatus } = fcm;
      let messaging: any = null;
      try {
        messaging = getMessaging();
      } catch (nativeErr: any) {
        return null;
      }
      if (!messaging) return null;

      // ── iOS permission ──────────────────────────────────────────────
      if (Platform.OS === 'ios') {
        const authStatus = await requestPermission(messaging);
        const enabled =
          authStatus === AuthorizationStatus.AUTHORIZED ||
          authStatus === AuthorizationStatus.PROVISIONAL;
        if (!enabled) {
          console.warn('[FCM] ❌ iOS notification permission denied.');
          return null;
        }
      }

      // ── Get FCM token ───────────────────────────────────────────────
      const token = await getToken(messaging);

      console.log('[FCM] ✅ Token obtained:', token ? token.slice(0, 30) + '...' : 'null');

      if (token) {
        this._lastRegisteredToken = token;
        await this.sendTokenToBackend(token);
      }

      return token;
    } catch (err: any) {
      console.warn('[FCM] ℹ️ Push notifications registration skipped in dev:', err?.message || err);
      return null;
    }
  },

  /**
   * Send the FCM token to our backend so the server can push to this device.
   */
  async sendTokenToBackend(token: string, force = false) {
    if (!token) return;
    try {
      await api.post('/notifications/register-token', {
        push_token: token,
        platform: Platform.OS,
        device_name: Platform.OS === 'android' ? 'Android Device' : 'iOS Device',
      });
      console.log('[FCM] ✅ Token registered with backend.');
    } catch (err: any) {
      console.warn('[FCM] ⚠️ Failed to send token to backend:', err?.message || err);
    }
  },

  /**
   * Remove the FCM token from the backend on logout.
   */
  async disableNotifications() {
    if (this._lastRegisteredToken) {
      await this.removeTokenFromBackend(this._lastRegisteredToken);
      this._lastRegisteredToken = null;
    }
  },

  async removeTokenFromBackend(token: string) {
    if (!token) return;
    try {
      await api.post('/notifications/deregister-token', { push_token: token });
    } catch (err) {}
  },

  /**
   * Set up Firebase foreground message handler and token refresh listener.
   * Returns a cleanup function to call on unmount.
   */
  setupNotificationListeners(navigate?: (screen: string, params?: any) => void): () => void {
    let unsubscribeForeground = () => {};
    let unsubscribeRefresh = () => {};

    try {
      const fcm = getFirebaseMessagingModule();
      if (!fcm) return () => {};

      const { getMessaging, onMessage, onTokenRefresh, onNotificationOpenedApp, getInitialNotification } = fcm;
      let messaging: any = null;
      try {
        messaging = getMessaging();
      } catch (_) {
        return () => {};
      }
      if (!messaging) return () => {};

      // Foreground message handler
      unsubscribeForeground = onMessage(messaging, (remoteMessage: any) => {
        console.log('[FCM] 📨 Foreground message:', remoteMessage.notification?.title);
        if (navigate && remoteMessage.data?.screen) {
          navigate(String(remoteMessage.data.screen), remoteMessage.data.params || {});
        }
      });

      // Token refresh
      unsubscribeRefresh = onTokenRefresh(messaging, (newToken: string) => {
        console.log('[FCM] 🔄 Token refreshed, updating backend...');
        this._lastRegisteredToken = newToken;
        this.sendTokenToBackend(newToken).catch(() => {});
      });

      // Background / quit state notification tap handler
      onNotificationOpenedApp(messaging, (remoteMessage: any) => {
        const screen = remoteMessage.data?.screen as string | undefined;
        const params = remoteMessage.data?.params;
        if (navigate && screen) {
          navigate(screen, params || {});
        }
      });

      // Check if app was launched from a killed state via notification tap
      getInitialNotification(messaging).then((remoteMessage: any) => {
        if (remoteMessage) {
          const screen = remoteMessage.data?.screen as string | undefined;
          const params = remoteMessage.data?.params;
          if (navigate && screen) {
            setTimeout(() => navigate(screen, params || {}), 500);
          }
        }
      }).catch(() => {});
    } catch (e) {
      console.warn('[FCM] setupNotificationListeners error:', e);
    }

    return () => {
      unsubscribeForeground();
      unsubscribeRefresh();
    };
  },
};

// ── Notification type definitions ────────────────────────────────────────────
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
      return { title: '🍲 Today\'s Lunch Ready', body: customData?.body || 'Paneer Butter Masala 🍛' };
    case 'NOTICE':
      return { title: '📢 New Notice', body: customData?.body || 'Mess timings updated.' };
    case 'MAINTENANCE':
      return { title: '🔧 Maintenance Update', body: customData?.body || 'Water supply will stop at 10 AM.' };
    case 'DOCUMENT':
      return { title: '📄 Receipt Available', body: customData?.body || 'June payment receipt is ready.' };
    case 'EXPENSE':
      return { title: '💸 Add Today\'s Expense', body: customData?.body || 'Don\'t forget to enter your expenses.' };
    case 'COMPLAINT':
      return { title: '⚙️ Complaint Updated', body: customData?.body || 'Your complaint has been updated.' };
    case 'BIRTHDAY':
      return { title: '🎂 Happy Birthday! 🥳', body: customData?.body || 'Have a wonderful day!' };
    case 'SUMMARY':
      return { title: '📊 Monthly Summary Ready', body: customData?.body || 'You spent ₹3,650 this month.' };
    case 'MOTIVATIONAL':
      return { title: '⭐ Great Job!', body: customData?.body || 'No pending dues this month.' };
    case 'SUPPORT':
      return { title: '💬 We\'re here for you! 😊', body: customData?.body || 'Need help? Our team is ready to assist.' };
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
  // In-app test trigger placeholder
  console.log('[Notification] sendAppNotification triggered:', type, customData);
};
