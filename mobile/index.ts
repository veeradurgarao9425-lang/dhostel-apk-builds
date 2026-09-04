import '@react-native-firebase/app';
import { registerRootComponent } from 'expo';
import notifee, { EventType } from '@notifee/react-native';
import App from './App';
import { notificationService } from './src/services/notificationService';

// ── Notifee Background Event Handler ──────────────────────────────────────────
// Handles action buttons (Approve/Reject) and background notification events
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;
  console.log('[Notifee] Background event:', type, pressAction?.id);

  if (type === EventType.ACTION_PRESS && pressAction?.id) {
    await notificationService.handleNotificationAction(
      pressAction.id,
      notification?.data,
    );
  }
});

// ── Firebase Cloud Messaging Background Message Handler ───────────────────────
// Android OS automatically displays notifications when remoteMessage.notification is present.
try {
  const { getMessaging, setBackgroundMessageHandler } = require('@react-native-firebase/messaging');
  const messagingInstance = getMessaging();
  if (typeof setBackgroundMessageHandler === 'function') {
    setBackgroundMessageHandler(messagingInstance, async (remoteMessage: any) => {
      console.log('[FCM] 📨 Background message received:', remoteMessage?.messageId);
    });
  }
} catch (e) {
  console.warn('[FCM] Error setting background message handler:', e);
}

registerRootComponent(App);

