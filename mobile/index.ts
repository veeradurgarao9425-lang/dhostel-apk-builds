import { registerRootComponent } from 'expo';
import { NativeModules } from 'react-native';
import App from './App';

// ── Firebase background message handler ──────────────────────────────────────
// Registered before registerRootComponent so FCM can wake the app on background messages.
try {
  const hasNativeFirebase = !!(
    NativeModules?.RNFBAppModule ||
    NativeModules?.RNFBMessagingModule ||
    (typeof (global as any)?.__turboModuleProxy === 'function' && (global as any)?.__turboModuleProxy('NativeRNFBTurboApp'))
  );
  if (hasNativeFirebase) {
    const { getMessaging, setBackgroundMessageHandler } = require('@react-native-firebase/messaging');
    const messaging = getMessaging();
    if (messaging) {
      setBackgroundMessageHandler(messaging, async (remoteMessage: any) => {
        console.log('[FCM] Background message received:', remoteMessage?.notification?.title);
      });
    }
  }
} catch (e) {
  // Native Firebase module not linked in current dev binary (active after native build)
}

registerRootComponent(App);
