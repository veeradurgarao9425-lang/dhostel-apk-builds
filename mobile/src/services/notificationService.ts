// export const Notifications = ... (expo-notifications disabled; migrating to Firebase)
import { Platform } from 'react-native';

export const notificationService = {
  _lastRegisteredToken: null as string | null,
  _handledNotificationIds: new Set<string>(),
  _appLaunchTime: Date.now(),

  async registerForPushNotificationsAsync() {
    // Disabled as requested (migrating to Firebase Cloud Messaging)
    return null;
  },

  async sendTokenToBackend(_token: string, _force = false) {
    // Disabled as requested
    return;
  },

  async disableNotifications() {
    // Disabled as requested
    return;
  },

  async removeTokenFromBackend(_token: string) {
    // Disabled as requested
    return;
  },

  setupNotificationListeners(_navigate?: (screen: string, params?: any) => void) {
    // Disabled as requested (migrating to Firebase Cloud Messaging)
    return () => {};
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
 * Fire a local push notification (disabled while migrating to Firebase)
 */
export const sendAppNotification = async (_type: NotificationType, _customData?: any) => {
    // Disabled while migrating to Firebase
    return;
};
