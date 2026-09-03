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

import messaging from '@react-native-firebase/messaging';

// ── Firebase Cloud Messaging Background Message Handler ───────────────────────
// Android OS automatically displays notifications when remoteMessage.notification is present.
// We only manually display for data-only messages to prevent duplicate notifications.
messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
  console.log('[FCM] 📨 Background message received:', remoteMessage?.messageId);
  if (!remoteMessage?.notification && (remoteMessage?.data?.title || remoteMessage?.data?.message)) {
    const title = remoteMessage.data?.title || 'Hostix Alert 🔔';
    const body = remoteMessage.data?.message || remoteMessage.data?.body || '';
    const data = remoteMessage.data || {};
    await notificationService.displayRichNotification({
      id: remoteMessage.messageId,
      title,
      body,
      category: data.category || data.type,
      data,
      largeIconUrl: data.imageUrl,
    });
  }
});

registerRootComponent(App);
