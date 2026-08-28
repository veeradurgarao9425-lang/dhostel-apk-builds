import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  _lastRegisteredToken: null as string | null,
  _handledNotificationIds: new Set<string>(),
  _appLaunchTime: Date.now(),

  async registerForPushNotificationsAsync(): Promise<string | null> {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Hostix Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6D4AFF',
          sound: 'default',
        });
      }

      if (!Device.isDevice) {
        console.log('[NotificationService] Simulator/emulator detected, push token skipped.');
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[NotificationService] Permission not granted for push notifications.');
        return null;
      }

      let token: string | null = null;
      try {
        // Prioritize native Firebase Cloud Messaging (FCM) device token via google-services.json
        const deviceTokenData = await Notifications.getDevicePushTokenAsync();
        if (deviceTokenData?.data) {
          token = String(deviceTokenData.data);
          console.log('[NotificationService] Obtained native Firebase FCM token.');
        }
      } catch (fcmErr) {
        console.log('[NotificationService] getDevicePushTokenAsync notice, trying Expo token:', fcmErr);
      }

      if (!token) {
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          Constants?.easConfig?.projectId ??
          '7303856b-fde0-4922-baf9-c6487aa06e02';

        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        token = tokenData?.data || null;
      }
      if (token) {
        this._lastRegisteredToken = token;
        await this.sendTokenToBackend(token);
      }
      return token;
    } catch (err: any) {
      console.warn('[NotificationService] Push registration notice:', err?.message || err);
      return null;
    }
  },

  async sendTokenToBackend(token: string, force = false) {
    if (!token) return;
    try {
      await api.post('/notifications/register-token', {
        push_token: token,
        platform: Platform.OS,
        device_name: Device.modelName || 'Mobile Device',
      });
      console.log('[NotificationService] Registered push token with backend.');
    } catch (err: any) {
      console.warn('[NotificationService] Failed to send push token to backend:', err?.message || err);
    }
  },

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

  setupNotificationListeners(navigate?: (screen: string, params?: any) => void) {
    const subReceived = Notifications.addNotificationReceivedListener(notification => {
      console.log('[NotificationService] Push notification received in foreground:', notification.request.content.title);
    });

    const subResponse = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (navigate && data?.screen) {
        navigate(String(data.screen), data.params || {});
      }
    });

    return () => {
      subReceived.remove();
      subResponse.remove();
    };
  }
};

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
  try {
    const { title, body } = getNotificationContent(type, customData);
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: customData,
      },
      trigger: null,
    });
  } catch (e) {}
};
