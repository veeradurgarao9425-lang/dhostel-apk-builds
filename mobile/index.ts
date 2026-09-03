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
  const messagingModule = require('@react-native-firebase/messaging');
  const fcm = typeof messagingModule === 'function' ? messagingModule() : (messagingModule.default ? messagingModule.default() : null);
  if (fcm && typeof fcm.setBackgroundMessageHandler === 'function') {
    fcm.setBackgroundMessageHandler(async (remoteMessage: any) => {
      console.log('[FCM] 📨 Background message received:', remoteMessage?.messageId);
    });
  }
} catch (_) {}

registerRootComponent(App);
