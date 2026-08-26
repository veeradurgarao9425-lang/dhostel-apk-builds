import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// Configure how notifications are handled when the app is open (foreground).
// SDK 54 API (expo-notifications 0.32): handler must return shouldShowBanner/shouldShowList,
// not the deprecated shouldShowAlert — otherwise foreground pushes play a sound but show no banner.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  console.log('Notification handler initialized with fallback.');
}

import { getSecureItem } from './secureStore';

export const notificationService = {
  _lastRegisteredToken: null as string | null,
  _handledNotificationIds: new Set<string>(),
  _appLaunchTime: Date.now(),

  async registerForPushNotificationsAsync() {
    let token: string | null = null;

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Hostix Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6D4AFF',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
      } catch (channelErr) {
        console.warn('Failed to configure Android notification channel:', channelErr);
      }
    }

    try {
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

      // 1. Fetch native FCM Device Token (for direct Google Firebase Cloud Messaging)
      try {
        const deviceTokenResponse = await Notifications.getDevicePushTokenAsync();
        if (deviceTokenResponse?.data) {
          token = String(deviceTokenResponse.data);
          await this.sendTokenToBackend(token);
        }
      } catch (fcmTokenErr: any) {
        console.log('FCM token retrieval note:', fcmTokenErr?.message || fcmTokenErr);
      }

      // 2. Fetch Expo Push Token as universal fallback
      try {
        const expoTokenResponse = await Notifications.getExpoPushTokenAsync().catch(() => null);
        if (expoTokenResponse?.data && expoTokenResponse.data !== token) {
          await this.sendTokenToBackend(expoTokenResponse.data);
          if (!token) token = expoTokenResponse.data;
        }
      } catch (expoTokenErr: any) {
        console.log('Expo token retrieval note:', expoTokenErr?.message || expoTokenErr);
      }
    } catch (err: any) {
      console.log('Error initializing push notifications:', err?.message || err);
    }

    return token;
  },

  async sendTokenToBackend(token: string, force = false) {
    if (!token) return;
    if (!force && this._lastRegisteredToken === token) {
      return;
    }

    try {
      const storedToken = (await getSecureItem('token')) || (await AsyncStorage.getItem('token'));
      if (!storedToken) {
        return;
      }

      const response = await api.post('/notifications/register-token', {
        push_token: token,
        device_name: Device.modelName || 'Unknown Device',
        platform: Platform.OS,
      });
      this._lastRegisteredToken = token;
      console.log('Push token registered on backend successfully:', response.data);
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        console.warn('Notice registering push token on backend:', error?.message || error);
      }
    }
  },

  async disableNotifications() {
    if (!Device.isDevice) return;
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;
      const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
      if (tokenResponse.data) {
        await this.removeTokenFromBackend(tokenResponse.data);
      }
    } catch (error) {
      console.error('Error disabling push notifications:', error);
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
    const handleResponse = (response: Notifications.NotificationResponse, isColdStart = false) => {
      if (!response) return;

      const identifier = response.notification?.request?.identifier;
      if (isColdStart && identifier) {
        if (this._handledNotificationIds.has(identifier)) {
          return;
        }
        this._handledNotificationIds.add(identifier);
      }

      console.log('Notification response received:', response);
      const data = response?.notification?.request?.content?.data || {};
      const title = (response?.notification?.request?.content?.title || '').toLowerCase();
      const dataType = typeof data.type === 'string' ? data.type.toUpperCase() : '';

      // 1. Direct screen targeting if provided in payload data
      if (data.screen && typeof data.screen === 'string') {
        let parsedParams = data.params;
        if (typeof parsedParams === 'string') {
          try { parsedParams = JSON.parse(parsedParams); } catch {}
        }
        navigate(data.screen, parsedParams || data);
        return;
      }
      
      const sid = data.studentId || data.student_id || data.id;
      const rid = data.roomId || data.room_id;
      const gid = data.guestId || data.guest_id;
      const nid = data.noticeId || data.notice_id;
      const cid = data.complaintId || data.complaint_id;

      // 2. Overdue / Due / Pending Rent / Vacate Bed -> Student Details (Single) or Students List (Bulk)
      if (
        dataType === 'VACATE' ||
        dataType === 'DUE_REMINDER' ||
        dataType === 'PENDING_PAYMENT' ||
        dataType === 'OVERDUE' ||
        dataType === 'PAYMENT DUE' ||
        dataType === 'PAYMENT_DUE' ||
        title.includes('vacat') ||
        title.includes('overdue') ||
        title.includes('due') ||
        title.includes('reminder')
      ) {
        if (sid) {
          navigate('StudentDetails', { studentId: sid, activeTab: 'payments' });
        } else {
          navigate('Students', { tab: 'Overdue' });
        }
        return;
      }

      // 3. New Admission / QR Code / Registration
      if (
        dataType === 'QR_CODE' ||
        dataType === 'PREBOOKING' ||
        dataType === 'NEW_ADMISSION_REQUEST' ||
        dataType === 'NEW ADMISSION' ||
        dataType === 'NEW_ADMISSION' ||
        title.includes('qr') ||
        title.includes('registration') ||
        title.includes('admission') ||
        title.includes('enrolled')
      ) {
        if (sid) {
          navigate('StudentDetails', { studentId: sid });
        } else {
          navigate('Students', { tab: 'All' });
        }
        return;
      }

      // 4. Payment Verification / Verify Rent / Payment Proof
      if (
        dataType === 'PAYMENT_PROOF' ||
        dataType === 'PAYMENT PROOF' ||
        dataType === 'PAYMENT_VERIFICATION' ||
        title.includes('proof') ||
        title.includes('verify')
      ) {
        navigate('PaymentVerification', data);
        return;
      }

      // 5. Payment Received / Collected Rent -> Tenant Transactions (Single) or Collected Payments (Bulk)
      if (
        dataType === 'PAYMENT' ||
        dataType === 'PAYMENT_SUCCESS' ||
        dataType === 'PAYMENT_COLLECTED' ||
        title.includes('payment') ||
        title.includes('collect') ||
        title.includes('receipt') ||
        title.includes('paid')
      ) {
        if (sid) {
          navigate('TenantTransactions', {
            studentId: sid,
            studentName: data.student_name || data.studentName,
          });
        } else {
          navigate('CollectedPayments');
        }
        return;
      }

      // 6. Room Related -> Single Room Details or Rooms List
      if (dataType === 'ROOM' || dataType === 'ROOM_ALLOCATED' || title.includes('room') || title.includes('bed')) {
        if (rid) {
          navigate('RoomDetails', { roomId: rid });
        } else {
          navigate('Rooms');
        }
        return;
      }

      // 7. Guest / Short-Stay Check-in -> Single Guest Details or Guests List
      if (dataType === 'GUEST' || dataType === 'GUEST_CHECKIN' || title.includes('guest')) {
        if (gid) {
          navigate('GuestDetails', { guestId: gid });
        } else {
          navigate('Guests');
        }
        return;
      }

      // 8. Complaint / Maintenance -> Complaints Management
      if (dataType === 'COMPLAINT' || dataType === 'MAINTENANCE' || title.includes('complaint') || title.includes('maintenance')) {
        navigate('ComplaintsManagement', data);
        return;
      }

      // 9. Notice -> Notice Details or Notices List
      if (dataType === 'NOTICE' || title.includes('notice')) {
        if (nid) {
          navigate('NoticeDetails', { noticeId: nid, notice: data });
        } else {
          navigate('Notices');
        }
        return;
      }

      // 10. Expenses
      if (dataType === 'EXPENSE' || title.includes('expense')) {
        navigate('Expenses');
        return;
      }

      // 11. Summary Reports
      if (dataType === 'SUMMARY' || title.includes('summary') || title.includes('report')) {
        navigate('Reports');
        return;
      }

      // Fallback: Notifications screen
      if (!isColdStart) {
        navigate('Notifications');
      }
    };

    // Handle cold-start: user clicked notification when app was closed/killed
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        const identifier = response.notification?.request?.identifier;
        if (identifier && !this._handledNotificationIds.has(identifier)) {
          // Check if the response was triggered around this session (within 30 seconds of launch)
          const notifDate = response.notification?.date;
          const isRecent = notifDate ? (Date.now() - notifDate * 1000 < 60000) : false;
          
          // Only auto-route if it has actual specific payload data or is freshly tapped
          const hasData = response?.notification?.request?.content?.data && 
                          Object.keys(response.notification.request.content.data).length > 0;
          if (hasData || isRecent) {
            setTimeout(() => handleResponse(response, true), 500);
          } else {
            // Mark as handled without routing so it doesn't cause unexpected popups
            if (identifier) this._handledNotificationIds.add(identifier);
          }
        }
      }
    }).catch(err => console.log('Error checking last notification response:', err));

    // Fired whenever a notification is received in the foreground
    const notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
    });

    // Fired when user taps/interacts with notification while app is running/backgrounded
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      handleResponse(response, false);
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
