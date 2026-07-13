import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ToastProvider } from './src/context/ToastContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { NotificationSocketProvider } from './src/context/NotificationSocketContext';
import AppNavigator from './src/navigation/AppNavigator';
import { CustomToast, ToastVariant } from './src/components/ui/CustomToast';
import SplashScreenView from './src/components/SplashScreenView';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

const ThemedToast = () => {
  const renderToast = (variant: ToastVariant, props: any) => (
    <CustomToast 
      variant={variant}
      title={props.text1 || ''}
      message={props.text2 || ''}
      progress={props.props?.progress}
      onAction={props.props?.onAction}
      onClose={() => Toast.hide()}
    />
  );

  const toastConfig = {
    success: (props: any) => renderToast('success', props),
    error: (props: any) => renderToast('error', props),
    warning: (props: any) => renderToast('warning', props),
    info: (props: any) => renderToast('info', props),
    payment: (props: any) => renderToast('payment', props),
    online: (props: any) => renderToast('online', props),
    offline: (props: any) => renderToast('offline', props),
    expense: (props: any) => renderToast('expense', props),
    notice: (props: any) => renderToast('notice', props),
    lowBalance: (props: any) => renderToast('lowBalance', props),
    saving: (props: any) => renderToast('saving', props),
    downloading: (props: any) => renderToast('downloading', props),
  };

  return <Toast config={toastConfig} position="top" topOffset={50} />;
};

/**
 * InnerApp — manages the splash overlay lifecycle.
 *
 * The blink fix:
 *   Native expo splash → hides ONLY after our React overlay has been laid out
 *   on screen (onPainted callback). This guarantees no white-flash between
 *   the native splash and our purple overlay.
 */
function InnerApp() {
  const { loading } = useAuth();
  const [minDelayDone, setMinDelayDone] = useState(false);
  // Track whether the React SplashScreenView has been painted on screen
  const [overlayPainted, setOverlayPainted] = useState(false);
  const hideAsyncCalled = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Hide the NATIVE expo splash only once our React overlay has been painted.
  // This eliminates the white blink between native splash and React overlay.
  useEffect(() => {
    if (overlayPainted && !hideAsyncCalled.current) {
      hideAsyncCalled.current = true;
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [overlayPainted]);

  const isReady = !loading && minDelayDone;

  return (
    <>
      <AppNavigator />
      <SplashScreenView
        isReady={isReady}
        onPainted={() => setOverlayPainted(true)}
      />
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <NetworkProvider>
        <AuthProvider>
          <NotificationSocketProvider>
            <SafeAreaProvider style={styles.container}>
              <InnerApp />
              <ThemedToast />
            </SafeAreaProvider>
          </NotificationSocketProvider>
        </AuthProvider>
      </NetworkProvider>
    </ToastProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
