import { registerRootComponent } from 'expo';
import { getMessaging, setBackgroundMessageHandler, type RemoteMessage } from '@react-native-firebase/messaging';
import App from './App';

// ── Firebase background message handler ──────────────────────────────────────
// Registered before registerRootComponent so FCM can wake the app on background messages.
try {
  const messaging = getMessaging();
  if (messaging) {
    setBackgroundMessageHandler(messaging, async (remoteMessage: RemoteMessage) => {
      console.log('[FCM] Background message received:', remoteMessage.notification?.title);
    });
  }
} catch (e) {
  // Native Firebase module not linked in current dev binary (active after native build)
}

registerRootComponent(App);
