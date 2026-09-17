/**
 * notificationService.ts
 * Pure Firebase Cloud Messaging (FCM) via @react-native-firebase/messaging modular API.
 * Safely guards native module access in local Expo dev environments.
 */
import { Platform, PermissionsAndroid, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export const createNotificationChannels = async () => {
  if (Platform.OS === 'android') {
    try {
      const Notifications = getExpoNotificationsModule();
      if (Notifications?.setNotificationChannelAsync) {
        const channelConfig = {
          name: 'Hostix Alerts & Food Menu',
          importance: Notifications.AndroidImportance?.MAX ?? 5,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#7C3AED',
          sound: 'default',
          enableLights: true,
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility?.PUBLIC ?? 1,
        };
        await Notifications.setNotificationChannelAsync('default', channelConfig);
        await Notifications.setNotificationChannelAsync('hostix_alerts', channelConfig);
        console.log('[Notification] ✅ Android notification channels registered: default, hostix_alerts');
      }
    } catch (_) {}
  }
};

// Immediately invoke channel creation on module import
createNotificationChannels().catch(() => {});

export const notificationService = {
  _lastRegisteredToken: null as string | null,
  _pendingInitialNavigation: null as { screen: string; params?: any } | null,

  setPendingInitialRoute(screen: string, params?: any) {
    if (!screen) return;
    console.log('[Notification] 📌 Stored pending initial navigation route:', screen, params);
    this._pendingInitialNavigation = { screen, params };
  },

  getPendingInitialRoute() {
    return this._pendingInitialNavigation;
  },

  consumePendingInitialRoute() {
    const route = this._pendingInitialNavigation;
    this._pendingInitialNavigation = null;
    if (route) {
      console.log('[Notification] 🚀 Consumed pending initial navigation route:', route.screen);
    }
    return route;
  },

  /**
   * Request permission (Android 13+ requires runtime POST_NOTIFICATIONS),
   * get the FCM token (or Expo push token fallback), and send it to our backend.
   */
  async registerForPushNotificationsAsync(): Promise<string | null> {
    try {
      // ── Android 13+ runtime permission ─────────────────────────────
      if (Platform.OS === 'android') {
        try {
          if (Platform.Version >= 33) {
            await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            );
          }
        } catch (_) {}
      }

      // Create Android Notification Channels (default & hostix_alerts)
      if (Platform.OS === 'android') {
        try {
          const Notifications = getExpoNotificationsModule();
          if (Notifications?.setNotificationChannelAsync) {
            const channelConfig = {
              name: 'Hostix Alerts & Food Menu',
              importance: Notifications.AndroidImportance.MAX,
              vibrationPattern: [0, 250, 250, 250],
              lightColor: '#7C3AED',
              sound: 'default',
              enableLights: true,
              enableVibrate: true,
              showBadge: true,
              lockscreenVisibility: Notifications.AndroidNotificationVisibility?.PUBLIC ?? 1,
            };
            await Notifications.setNotificationChannelAsync('default', channelConfig);
            await Notifications.setNotificationChannelAsync('hostix_alerts', channelConfig);
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
          if (nativeErr?.message?.includes?.('No Firebase App')) {
            console.log('[FCM] Native Firebase not initialized (standard behavior in Expo Go). Push tokens require standalone APK.');
          } else {
            console.warn('[FCM] Error initializing messaging instance:', nativeErr?.message || nativeErr);
          }
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

      // Pure Firebase FCM only — do NOT request or fallback to ExponentPushTokens
      if (token && !token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
        console.log('[FCM] ✅ Firebase FCM Token obtained:', token.slice(0, 30) + '...');
        this._lastRegisteredToken = token;
        AsyncStorage.setItem('cached_fcm_token', token).catch(() => {});
        await this.sendTokenToBackend(token);
      } else {
        const cached = await AsyncStorage.getItem('cached_fcm_token').catch(() => null);
        if (cached) {
          console.log('[FCM] ℹ️ Using cached FCM token for session sync:', cached.slice(0, 30) + '...');
          token = cached;
          this._lastRegisteredToken = cached;
          await this.sendTokenToBackend(cached);
        } else {
          console.log('[FCM] ℹ️ Native Firebase FCM is required for push tokens (Expo Go does not support native FCM).');
          token = null;
        }
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
    if (!token || token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')) return;
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

  /**
   * Immediately post a heads-up alert banner in the native system notification tray.
   */
  async triggerLocalNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      const Notifications = getExpoNotificationsModule();
      if (Notifications && typeof Notifications.scheduleNotificationAsync === 'function') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: 'default',
            channelId: 'hostix_alerts',
            data: data || {},
          },
          trigger: null,
        });
      }
    } catch (e) {
      console.warn('[Notification] triggerLocalNotification error:', e);
    }

    // Persist triggered notification into local storage so in-app badge count and notifications list show it immediately!
    try {
      const item = {
        notification_id: `loc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        title,
        message: body,
        notification_type: data?.referenceType ? String(data.referenceType) : 'General',
        created_at: new Date().toISOString(),
        is_read: 0,
        screen: data?.screen || 'TenantHome',
        params: data?.params || null,
        reference_type: data?.referenceType || null,
        reference_id: data?.referenceId || null,
      };
      await saveTriggeredNotification(item);
      DeviceEventEmitter.emit('REFRESH_NOTIFICATIONS');
    } catch (err) {
      console.warn('[Notification] saveTriggeredNotification error:', err);
    }
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

            // Post native Android OS status bar heads-up alert banner
            try {
              const Notifications = getExpoNotificationsModule();
              if (Notifications && typeof Notifications.scheduleNotificationAsync === 'function') {
                Notifications.scheduleNotificationAsync({
                  content: {
                    title,
                    body,
                    sound: 'default',
                    channelId: 'hostix_alerts',
                    data: { screen, params },
                  },
                  trigger: null,
                }).catch(() => {});
              }
            } catch (_) {}
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
            if (screen) {
              console.log('[Notification] 🔔 Opened notification from background:', screen, params);
              this.setPendingInitialRoute(screen, params || {});
              if (navigate) {
                navigate(screen, params || {});
              }
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
              if (screen) {
                console.log('[Notification] 🌟 Cold start from push notification tap:', screen, params);
                this.setPendingInitialRoute(screen, params || {});
                if (navigate) {
                  navigate(screen, params || {});
                }
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
            // Notification is already delivered natively by system
          });

          if (Notifications.addNotificationResponseReceivedListener) {
            unsubscribeExpoResponse = Notifications.addNotificationResponseReceivedListener((response: any) => {
              const data = response.notification?.request?.content?.data || {};
              if (data.screen) {
                console.log('[Notification] 🔔 Expo notification response clicked:', data.screen, data.params);
                this.setPendingInitialRoute(data.screen, data.params || {});
                if (navigate) {
                  navigate(data.screen, data.params || {});
                }
              }
            });
          }

          if (typeof Notifications.getLastNotificationResponseAsync === 'function') {
            Notifications.getLastNotificationResponseAsync().then((response: any) => {
              const data = response?.notification?.request?.content?.data || {};
              if (data.screen) {
                console.log('[Notification] 🌟 Cold start from Expo notification response:', data.screen, data.params);
                this.setPendingInitialRoute(data.screen, data.params || {});
                if (navigate) {
                  navigate(data.screen, data.params || {});
                }
              }
            }).catch(() => {});
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

// ── Local Triggered Notifications Persistence ────────────────────────────────
export const LOCAL_TRIGGERED_NOTIFS_KEY = 'hostix_local_triggered_notifications';

export async function getLocalTriggeredNotifications(): Promise<any[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_TRIGGERED_NOTIFS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function saveTriggeredNotification(notif: any): Promise<void> {
  try {
    const current = await getLocalTriggeredNotifications();
    const isDup = current.some(
      (n: any) =>
        n.title === notif.title &&
        Math.abs(new Date(n.created_at).getTime() - new Date(notif.created_at).getTime()) < 3600 * 1000
    );
    if (!isDup) {
      const updated = [notif, ...current].slice(0, 60);
      await AsyncStorage.setItem(LOCAL_TRIGGERED_NOTIFS_KEY, JSON.stringify(updated));
    }
  } catch {}
}

