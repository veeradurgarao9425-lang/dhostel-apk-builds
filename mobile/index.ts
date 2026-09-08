import { registerRootComponent } from 'expo';
import App from './App';

// Register Firebase background message handler for native Android APK
try {
  const messagingModule = require('@react-native-firebase/messaging');
  const messaging = typeof messagingModule === 'function' 
    ? messagingModule 
    : (messagingModule?.default || messagingModule?.getMessaging);
  if (messaging) {
    const instance = typeof messaging === 'function' ? messaging() : messaging;
    if (instance && typeof instance.setBackgroundMessageHandler === 'function') {
      instance.setBackgroundMessageHandler(async (remoteMessage: any) => {
        console.log('[FCM-Background] Received push in background/quit state:', remoteMessage?.notification?.title || remoteMessage?.data?.title);
      });
    }
  }
} catch (_) {
  // Gracefully ignored in Expo Go or web
}

registerRootComponent(App);
