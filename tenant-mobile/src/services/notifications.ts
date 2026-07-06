/**
 * Local due-reminder notifications — the core value proposition of the app.
 *
 * Instead of the owner manually nagging tenants, the app schedules on-device
 * reminders ahead of the rent due date: 7 days before, 3 days before, 1 day
 * before, and on the due date itself. All local (no server/push needed).
 *
 * SDK 54 API (expo-notifications 0.32): handler returns shouldShowBanner/List;
 * date triggers use { type: DATE, date }.
 */
import * as Notifications from 'expo-notifications';
import { Platform, DeviceEventEmitter } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import api from './api';
import { formatCurrency } from '../utils/format';

// Foreground presentation: show banner + list, play a sound.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const CHANNEL_ID = 'rent-reminders';
// Tag every reminder we schedule so we can clear just ours before rescheduling.
const TAG = 'rent-due-reminder';

let permissionAsked = false;

export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Rent reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
      // The backend always sends server push notifications with channelId: 'default'
      // (see backend/src/utils/notification.ts). Without a matching channel registered
      // on the device, Android silently drops these to a low-importance fallback channel
      // (delivered, but no heads-up popup/sound) — so this channel must exist too.
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (current.canAskAgain === false) return false;
    if (permissionAsked && !current.canAskAgain) return false;
    permissionAsked = true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

/** Cancel previously-scheduled rent reminders (so we never stack duplicates). */
async function clearOurReminders() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((s) => (s.content?.data as any)?.tag === TAG)
        .map((s) => Notifications.cancelScheduledNotificationAsync(s.identifier)),
    );
  } catch {
    // ignore
  }
}

/** A reminder fires at 10:00am on the offset day, if that moment is still future. */
function reminderDate(due: Date, daysBefore: number): Date | null {
  const d = new Date(due);
  d.setDate(d.getDate() - daysBefore);
  d.setHours(10, 0, 0, 0);
  return d.getTime() > Date.now() ? d : null;
}

/**
 * Re-sync local reminders to the tenant's current due. Call after we have fresh
 * /me data (e.g. on dashboard focus). No-op when there's nothing owed.
 */
export async function syncDueReminders(opts: {
  outstanding?: number | null;
  nextDueDate?: string | null;
}): Promise<void> {
  const amount = Number(opts.outstanding || 0);
  await clearOurReminders();

  if (amount <= 0 || !opts.nextDueDate) return;
  const due = new Date(opts.nextDueDate);
  if (isNaN(due.getTime())) return;

  const granted = await ensureNotificationPermission();
  if (!granted) return;

  const plan: { days: number; title: string; body: string }[] = [
    { days: 7, title: 'Rent due in a week', body: `${formatCurrency(amount)} is due in 7 days. Plan ahead 👍` },
    { days: 3, title: 'Rent due in 3 days', body: `Reminder: ${formatCurrency(amount)} rent is due soon.` },
    { days: 1, title: 'Rent due tomorrow', body: `${formatCurrency(amount)} is due tomorrow. Tap to pay.` },
    { days: 0, title: 'Rent due today', body: `${formatCurrency(amount)} is due today. Avoid late fees — pay now.` },
  ];

  for (const p of plan) {
    const when = reminderDate(due, p.days);
    if (!when) continue;
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title: p.title, body: p.body, data: { tag: TAG, type: 'due' } },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: when,
          channelId: CHANNEL_ID,
        },
      });
    } catch {
      // ignore individual scheduling failures
    }
  }
}

/**
 * Registers the device for push notifications with Expo, and sends the token to our backend.
 */
export async function registerPushTokenAsync(): Promise<void> {
  try {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return;
    }

    const granted = await ensureNotificationPermission();
    if (!granted) {
      console.log('Failed to get push token for push notification (permission not granted)!');
      return;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    if (!projectId) {
      console.log('No projectId found for Push Notifications. Skipping push token registration.');
      return;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse.data;
    
    if (token) {
      await api.post('/notifications/register-token', {
        push_token: token,
        device_name: Device.modelName || 'Tenant Device',
        platform: Platform.OS,
      });
      console.log('Push token registered successfully:', token);
    }
  } catch (error) {
    console.error('Error in registerPushTokenAsync:', error);
  }
}

/**
 * Wires up live push-notification handling: refreshes in-app state when a push
 * arrives in the foreground, and navigates to the Notifications screen on tap.
 * Call once from the navigator root; returns a cleanup function.
 */
export function setupNotificationListeners(navigationRef: { isReady: () => boolean; navigate: (...args: any[]) => void }) {
  const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
    DeviceEventEmitter.emit('REFRESH_NOTIFICATIONS');
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener(() => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('Notifications');
    }
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}
