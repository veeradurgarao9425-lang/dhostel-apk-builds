/**
 * notificationService.ts
 * Pure Firebase Cloud Messaging (FCM) via @react-native-firebase/messaging modular API.
 * Safely guards native module access in local Expo dev environments.
 */
import { Platform, PermissionsAndroid } from 'react-native';
import Toast from 'react-native-toast-message';
import api from './api';

const getFirebaseMessagingModule = () => {
  try {
    return require('@react-native-firebase/messaging');
  } catch {
    return null;
  }
};

const getExpoNotificationsModule = () => {
  try {
    return require('expo-notifications');
  } catch {
    return null;
  }
};

try {
  const Notifications = getExpoNotificationsModule();
  if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (_) {}

export const notificationService = {
  _lastRegisteredToken: null as string | null,

  /**
   * Request permission (Android 13+ requires runtime POST_NOTIFICATIONS),
   * get the FCM token (or Expo push token fallback), and send it to our backend.
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

      // Create Android Notification Channel
      if (Platform.OS === 'android') {
        try {
          const Notifications = getExpoNotificationsModule();
          if (Notifications?.setNotificationChannelAsync) {
            await Notifications.setNotificationChannelAsync('default', {
              name: 'Hostix Alerts',
              importance: Notifications.AndroidImportance.MAX,
              vibrationPattern: [0, 250, 250, 250],
              lightColor: '#6D4AFF',
              sound: 'default',
              enableLights: true,
              enableVibrate: true,
              showBadge: true,
            });
          }
        } catch (_) {}
      }

      let token: string | null = null;

      // ── 1. Try Firebase Cloud Messaging (Primary for Native APK) ──
      const fcm = getFirebaseMessagingModule();
      if (fcm) {
        let messagingInstance: any = null;
        try {
          if (typeof fcm === 'function') {
            messagingInstance = fcm();
          } else if (fcm.default && typeof fcm.default === 'function') {
            messagingInstance = fcm.default();
          } else if (typeof fcm.getMessaging === 'function') {
            messagingInstance = fcm.getMessaging();
          }
        } catch (nativeErr: any) {
          console.warn('[FCM] Error initializing messaging instance:', nativeErr);
        }

        if (messagingInstance) {
          // iOS permission
          if (Platform.OS === 'ios' && typeof messagingInstance.requestPermission === 'function') {
            try {
              const authStatus = await messagingInstance.requestPermission();
              const AuthorizationStatus = fcm.AuthorizationStatus || {};
              const enabled =
                authStatus === (AuthorizationStatus.AUTHORIZED ?? 1) ||
                authStatus === (AuthorizationStatus.PROVISIONAL ?? 2);
              if (!enabled) {
                console.warn('[FCM] ❌ iOS notification permission denied.');
              }
            } catch (_) {}
          }

          try {
            if (typeof messagingInstance.getToken === 'function') {
              token = await messagingInstance.getToken();
            } else if (typeof fcm.getToken === 'function') {
              token = await fcm.getToken(messagingInstance);
            }
          } catch (tokenErr: any) {
            console.warn('[FCM] Error obtaining FCM token:', tokenErr);
          }
        }
      }

      // ── 2. Fallback to Expo Push Token for Local / Expo Go Testing ──
      if (!token) {
        try {
          const Notifications = getExpoNotificationsModule();
          if (Notifications?.getExpoPushTokenAsync) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
              const { status } = await Notifications.requestPermissionsAsync();
              finalStatus = status;
            }
            if (finalStatus === 'granted') {
              const expoTokenData = await Notifications.getExpoPushTokenAsync();
              token = expoTokenData?.data || null;
            }
          }
        } catch (expoErr: any) {
          console.warn('[FCM/Expo] Error obtaining Expo token:', expoErr?.message || expoErr);
        }
      }

      console.log('[Notification] ✅ Token obtained:', token ? token.slice(0, 30) + '...' : 'null');

      if (token) {
        this._lastRegisteredToken = token;
        await this.sendTokenToBackend(token);
      }

      return token;
    } catch (err: any) {
      console.warn('[Notification] ℹ️ Push notifications registration skipped:', err?.message || err);
      return null;
    }
  },

  /**
   * Send the push token to our backend so the server can push to this device.
   */
  async sendTokenToBackend(token: string, force = false) {
    if (!token) return;
    try {
      await api.post('/notifications/register-token', {
        push_token: token,
        platform: Platform.OS,
        device_name: Platform.OS === 'android' ? 'Android Device' : 'iOS Device',
      });
      console.log('[Notification] ✅ Token registered with backend.');
    } catch (err: any) {
      console.warn('[Notification] ⚠️ Failed to send token to backend:', err?.message || err);
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

  async sendTestNotification(title?: string, message?: string, data?: any): Promise<boolean> {
    try {
      const res = await api.post('/notifications/test', {
        title: title || 'Test Push Notification',
        message: message || 'This is a live native push notification from Hostix!',
        data: data || { screen: 'Notifications' },
      });
      return !!res.data?.success;
    } catch {
      return false;
    }
  },

  /**
   * Set up notification listeners (foreground and click / background handlers).
   * Returns a cleanup function to call on unmount.
   */
  setupNotificationListeners(navigate?: (screen: string, params?: any) => void): () => void {
    let unsubscribeForeground = () => {};
    let unsubscribeRefresh = () => {};
    let unsubscribeExpoForeground: any = null;
    let unsubscribeExpoResponse: any = null;

    try {
      const fcm = getFirebaseMessagingModule();
      if (fcm) {
        let messagingInstance: any = null;
        try {
          if (typeof fcm === 'function') {
            messagingInstance = fcm();
          } else if (fcm.default && typeof fcm.default === 'function') {
            messagingInstance = fcm.default();
          } else if (typeof fcm.getMessaging === 'function') {
            messagingInstance = fcm.getMessaging();
          }
        } catch (_) {}

        if (messagingInstance) {
          // Foreground message handler
          const handleForeground = (remoteMessage: any) => {
            const title = remoteMessage.notification?.title || remoteMessage.data?.title || 'Notification';
            const body = remoteMessage.notification?.body || remoteMessage.data?.message || '';
            const screen = remoteMessage.data?.screen as string | undefined;
            let params = remoteMessage.data?.params;
            if (typeof params === 'string') {
              try { params = JSON.parse(params); } catch (_) {}
            }

            console.log('[FCM] 📨 Foreground message:', title, body);

            // 1. Post native Android OS status bar heads-up alert banner
            try {
              const Notifications = getExpoNotificationsModule();
              if (Notifications && typeof Notifications.scheduleNotificationAsync === 'function') {
                Notifications.scheduleNotificationAsync({
                  content: {
                    title,
                    body,
                    sound: 'default',
                    data: { screen, params },
                  },
                  trigger: null,
                }).catch(() => {});
              }
            } catch (_) {}

            // 2. Also show in-app Toast with action
            Toast.show({
              type: 'info',
              text1: title,
              text2: body,
              props: {
                onAction: () => {
                  if (navigate && screen) {
                    navigate(screen, params || {});
                  }
                }
              }
            });
          };

          if (typeof messagingInstance.onMessage === 'function') {
            unsubscribeForeground = messagingInstance.onMessage(handleForeground);
          } else if (typeof fcm.onMessage === 'function') {
            unsubscribeForeground = fcm.onMessage(messagingInstance, handleForeground);
          }

          // Token refresh
          const handleTokenRefresh = (newToken: string) => {
            console.log('[FCM] 🔄 Token refreshed, updating backend...');
            this._lastRegisteredToken = newToken;
            this.sendTokenToBackend(newToken).catch(() => {});
          };

          if (typeof messagingInstance.onTokenRefresh === 'function') {
            unsubscribeRefresh = messagingInstance.onTokenRefresh(handleTokenRefresh);
          } else if (typeof fcm.onTokenRefresh === 'function') {
            unsubscribeRefresh = fcm.onTokenRefresh(messagingInstance, handleTokenRefresh);
          }

          // Background / quit state notification tap handler
          const handleNotificationOpen = (remoteMessage: any) => {
            const screen = remoteMessage.data?.screen as string | undefined;
            let params = remoteMessage.data?.params;
            if (typeof params === 'string') {
              try { params = JSON.parse(params); } catch (_) {}
            }
            if (navigate && screen) {
              navigate(screen, params || {});
            }
          };

          if (typeof messagingInstance.onNotificationOpenedApp === 'function') {
            messagingInstance.onNotificationOpenedApp(handleNotificationOpen);
          } else if (typeof fcm.onNotificationOpenedApp === 'function') {
            fcm.onNotificationOpenedApp(messagingInstance, handleNotificationOpen);
          }

          // Check if app was launched from a killed state via notification tap
          const getInitial = typeof messagingInstance.getInitialNotification === 'function'
            ? messagingInstance.getInitialNotification()
            : (typeof fcm.getInitialNotification === 'function' ? fcm.getInitialNotification(messagingInstance) : Promise.resolve(null));

          getInitial.then((remoteMessage: any) => {
            if (remoteMessage) {
              const screen = remoteMessage.data?.screen as string | undefined;
              let params = remoteMessage.data?.params;
              if (typeof params === 'string') {
                try { params = JSON.parse(params); } catch (_) {}
              }
              if (navigate && screen) {
                setTimeout(() => navigate(screen, params || {}), 500);
              }
            }
          }).catch(() => {});
        }
      }

      // Also set up Expo Notification listener if available
      try {
        const Notifications = getExpoNotificationsModule();
        if (Notifications?.addNotificationReceivedListener) {
          unsubscribeExpoForeground = Notifications.addNotificationReceivedListener((notification: any) => {
            const title = notification.request?.content?.title || 'Notification';
            const body = notification.request?.content?.body || '';
            const data = notification.request?.content?.data || {};
            Toast.show({
              type: 'info',
              text1: title,
              text2: body,
              props: {
                onAction: () => {
                  if (navigate && data.screen) {
                    navigate(data.screen, data.params || {});
                  }
                }
              }
            });
          });

          if (Notifications.addNotificationResponseReceivedListener) {
            unsubscribeExpoResponse = Notifications.addNotificationResponseReceivedListener((response: any) => {
              const data = response.notification?.request?.content?.data || {};
              if (navigate && data.screen) {
                navigate(data.screen, data.params || {});
              }
            });
          }
        }
      } catch (_) {}
    } catch (e) {
      console.warn('[Notification] setupNotificationListeners error:', e);
    }

    return () => {
      unsubscribeForeground();
      unsubscribeRefresh();
      if (unsubscribeExpoForeground?.remove) unsubscribeExpoForeground.remove();
      if (unsubscribeExpoResponse?.remove) unsubscribeExpoResponse.remove();
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
