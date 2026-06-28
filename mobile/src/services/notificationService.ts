import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';

// Configure how notifications are handled when the app is open (foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  } as any),
});

export const notificationService = {
  async registerForPushNotificationsAsync() {
    let token = null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification (permission not granted)!');
        return null;
      }
      
      try {
        // Retrieve projectId for Expo push token
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          Constants?.easConfig?.projectId;
          
        const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
        token = tokenResponse.data;
        console.log('Expo Push Token retrieved:', token);
        
        if (token) {
          await this.sendTokenToBackend(token);
        }
      } catch (error) {
        console.error('Error fetching Expo push token:', error);
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  },

  async sendTokenToBackend(token: string) {
    try {
      const response = await api.post('/notifications/register-token', {
        push_token: token,
        device_name: Device.modelName || 'Unknown Device',
        platform: Platform.OS,
      });
      console.log('Push token registered on backend successfully:', response.data);
    } catch (error) {
      console.error('Error registering push token on backend:', error);
    }
  },

  async removeTokenFromBackend(token: string) {
    try {
      await api.post('/notifications/deregister-token', {
        push_token: token,
      });
      console.log('Push token removed from backend successfully');
    } catch (error) {
      console.error('Error deregistering push token on backend:', error);
    }
  },

  setupNotificationListeners(navigate: (screen: string, params?: any) => void) {
    // Fired whenever a notification is received in the foreground
    const notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
    });

    // Fired when user taps/interacts with notification
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification clicked:', response);
      const data = response.notification.request.content.data;
      
      if (data) {
        // Direct navigation based on notification payload structure
        if (data.type === 'New Admission') {
          if (data.id) {
            navigate('StudentDetails', { studentId: data.id });
          } else {
            navigate('Students');
          }
        } else if (title.includes('payment') || title.includes('collect') || data?.type === 'success') {
          navigate('FeeManagement');
        } else if (title.includes('tenant') || title.includes('admission')) {
          navigate('Rooms');
        }
      }
    });

    return () => {
      notificationSubscription.remove();
      responseSubscription.remove();
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

/**
 * Get standard formatting for all 20 types of Hostix notifications
 */
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

/**
 * Fire a local push notification that will appear in the phone's OS drawer
 */
export const sendAppNotification = async (type: NotificationType, customData?: any) => {
    const content = getNotificationContent(type, customData);
    
    await Notifications.scheduleNotificationAsync({
        content: {
            title: content.title,
            body: content.body,
            data: customData,
            sound: true,
        },
        trigger: null, // trigger immediately
    });
};
