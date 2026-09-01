import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { AssistantGate } from './src/components/AssistantGate';
import { ToastProvider } from './src/context/ToastContext';
import { NetworkManager } from './src/components/ui/NetworkManager';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { queryClient } from './src/lib/queryClient';
import { CustomToast, ToastVariant } from './src/components/ui/CustomToast';
import { OfflineBanner } from './src/components/OfflineBanner';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { Text, TextInput, LogBox } from 'react-native';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'Push notifications (remote notifications)',
  'warnOfExpoGoPushUsage',
]);

import { notificationService } from './src/services/notificationService';

SplashScreen.preventAutoHideAsync().catch(() => {});

import './src/i18n';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { DeveloperProvider } from './contexts/DeveloperContext';
import { SupportModeBanner } from './src/components/SupportModeBanner';
import { RefreshProvider } from './contexts/RefreshContext';
import { ConfirmationProvider } from './contexts/ConfirmationContext';
import { SocketProvider } from './src/context/SocketContext';
import { AppLockGate } from './src/components/security/AppLockGate';

const ThemedToast = () => {
  const { theme, isDark } = useTheme();

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
    // Register push notification token on app launch
    notificationService.registerForPushNotificationsAsync().catch(() => {});

    // Safety fallback: Unfreeze and show UI within 1200ms max even if font network stalls
    const timeout = setTimeout(() => {
      setForceReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }, 1200);

    if (fontsLoaded) {
      clearTimeout(timeout);
      SplashScreen.hideAsync().catch(() => {});
      
      // Global font override
      try {
        const TextAny = Text as any;
        if (!TextAny.defaultProps) {
          TextAny.defaultProps = {};
        }
        TextAny.defaultProps.style = [{ fontFamily: 'Inter_500Medium' }, TextAny.defaultProps.style];
      } catch (e) {
        console.warn('Failed to override Text.defaultProps:', e);
      }

      try {
        const TextInputAny = TextInput as any;
        if (!TextInputAny.defaultProps) {
          TextInputAny.defaultProps = {};
        }
        TextInputAny.defaultProps.style = [{ fontFamily: 'Inter_500Medium' }, TextInputAny.defaultProps.style];
      } catch (e) {
        console.warn('Failed to override TextInput.defaultProps:', e);
      }
    }

    return () => clearTimeout(timeout);
  }, [fontsLoaded]);

  // Which routes show the assistant now lives in <AssistantGate />, so a screen
  // change no longer re-renders this root component (and with it every provider).

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
                  <AppLockGate>
                    <NetworkManager>
                      <AppNavigator />
                    </NetworkManager>
                  </AppLockGate>
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
