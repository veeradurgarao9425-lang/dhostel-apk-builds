import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import { AssistantGate } from './src/components/AssistantGate';
import { ToastProvider } from './src/context/ToastContext';
import { NetworkManager } from './src/components/ui/NetworkManager';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { queryClient } from './src/lib/queryClient';
import { CustomToast, ToastVariant } from './src/components/ui/CustomToast';
import { OfflineBanner } from './src/components/OfflineBanner';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'Push notifications (remote notifications)',
  'warnOfExpoGoPushUsage',
]);

import './src/i18n';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { DeveloperProvider } from './contexts/DeveloperContext';
import { SupportModeBanner } from './src/components/SupportModeBanner';
import { RefreshProvider } from './contexts/RefreshContext';
import { ConfirmationProvider } from './contexts/ConfirmationContext';
import { SocketProvider } from './src/context/SocketContext';

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

import { notificationService } from './src/services/notificationService';

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  const [forceReady, setForceReady] = React.useState(false);

  React.useEffect(() => {
    // Safety fallback: Unfreeze and show UI within 800ms max
    const timeout = setTimeout(() => {
      setForceReady(true);
      try { SplashScreen.hideAsync().catch(() => {}); } catch (_) {}
    }, 800);

    if (fontsLoaded) {
      clearTimeout(timeout);
      try { SplashScreen.hideAsync().catch(() => {}); } catch (_) {}

      // Register push notifications safely after UI is rendered
      setTimeout(() => {
        notificationService.registerForPushNotificationsAsync().catch(() => {});
      }, 500);
    }

    return () => clearTimeout(timeout);
  }, [fontsLoaded]);

  if (!fontsLoaded && !forceReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#5F2EEA' }} />
    );
  }

  return (
    <SafeAreaProvider style={styles.container}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <DeveloperProvider>
              <SocketProvider>
                <RefreshProvider>
                  <ThemeProvider>
                    <ConfirmationProvider>
                      <ToastProvider>
                        <SupportModeBanner />
                        <OfflineBanner />
                        <NetworkManager>
                          <AppNavigator />
                        </NetworkManager>
                        <AssistantGate />
                        <ThemedToast />
                      </ToastProvider>
                    </ConfirmationProvider>
                  </ThemeProvider>
                </RefreshProvider>
              </SocketProvider>
            </DeveloperProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
