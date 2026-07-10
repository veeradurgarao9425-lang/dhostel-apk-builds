import React, { useState, useEffect } from 'react';
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

/** Inner wrapper that reads auth loading state for the splash */
function InnerApp() {
  const { loading } = useAuth();
  // Keep splash visible for at least 1.5s as a brand moment
  const [minDelayDone, setMinDelayDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const isReady = !loading && minDelayDone;

  return (
    <>
      <AppNavigator />
      <SplashScreenView isReady={isReady} />
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
