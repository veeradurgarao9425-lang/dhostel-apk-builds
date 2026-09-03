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
try {
  const messaging = require('@react-native-firebase/messaging');
  const fcm = typeof messaging === 'function' ? messaging() : (messaging.default ? messaging.default() : null);
  if (fcm && typeof fcm.setBackgroundMessageHandler === 'function') {
    fcm.setBackgroundMessageHandler(async (remoteMessage: any) => {
      console.log('[FCM] Background message received:', remoteMessage.messageId);
      const title = remoteMessage.notification?.title || remoteMessage.data?.title || 'Alert 🔔';
      const body = remoteMessage.notification?.body || remoteMessage.data?.message || '';
      const data = remoteMessage.data || {};
      await notificationService.displayRichNotification({
        id: remoteMessage.messageId,
        title,
        body,
        category: data.category || data.type,
        data,
        largeIconUrl: remoteMessage.notification?.android?.imageUrl || data.imageUrl,
      });
    });
  }
} catch (_) {}

registerRootComponent(App);
