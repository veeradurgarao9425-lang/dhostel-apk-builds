import { registerRootComponent } from 'expo';
import App from './App';

// ── Firebase background message handler ──────────────────────────────────────
// Registered before registerRootComponent so FCM can wake the app on background messages.
try {
  const messaging = require('@react-native-firebase/messaging');
  const messagingFunc = messaging?.default || messaging;
  if (typeof messagingFunc === 'function') {
    messagingFunc().setBackgroundMessageHandler(async (remoteMessage: any) => {
      console.log('[FCM] Background message received:', remoteMessage?.notification?.title);
    });
  }
} catch (e) {
  // Native Firebase module not initialized in current context
}

registerRootComponent(App);
