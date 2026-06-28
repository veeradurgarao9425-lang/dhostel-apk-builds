import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { HostelChatbot } from './src/components/HostelChatbot';
import { ToastProvider } from './src/context/ToastContext';
import { NetworkManager } from './src/components/ui/NetworkManager';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { queryClient } from './src/lib/queryClient';
import { CustomToast, ToastVariant } from './src/components/ui/CustomToast';

import './src/i18n';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { RefreshProvider } from './contexts/RefreshContext';
import { ConfirmationProvider } from './contexts/ConfirmationContext';

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
  const [currentRoute, setCurrentRoute] = useState<string | undefined>(undefined);

  // Show chatbot on all authenticated screens; hide on Splash, Login, Register, QRSignup and any Add form screens
  const showChatbot = !!currentRoute && 
    currentRoute !== 'Splash' && 
    currentRoute !== 'Login' && 
    currentRoute !== 'Register' &&
    currentRoute !== 'QRSignup' &&
    !currentRoute.startsWith('Add');

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RefreshProvider>
          <ThemeProvider>
            <ConfirmationProvider>
            <ToastProvider>
              <SafeAreaProvider style={styles.container}>
                <NetworkManager>
                  <AppNavigator
                    onRouteChange={(routeName: string) => setCurrentRoute(routeName)}
                  />
                </NetworkManager>
                {showChatbot && <HostelChatbot />}
                <ThemedToast />
              </SafeAreaProvider>
            </ToastProvider>
            </ConfirmationProvider>
          </ThemeProvider>
          </RefreshProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
