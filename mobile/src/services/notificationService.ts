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
        } else if (data.type === 'Payment Due' || data.type === 'General') {
          navigate('FinanceTab', { mode: 'Rent' });
        } else if (data.type === 'System Alert') {
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
