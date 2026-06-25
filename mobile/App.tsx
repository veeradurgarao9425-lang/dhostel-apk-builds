import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { HostelChatbot } from './src/components/HostelChatbot';
import { ToastProvider } from './src/context/ToastContext';
import { OfflineFallback } from './src/components/OfflineFallback';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { queryClient } from './src/lib/queryClient';

import './src/i18n';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { RefreshProvider } from './contexts/RefreshContext';
import { ConfirmationProvider } from './contexts/ConfirmationContext';

const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#10B981', borderLeftWidth: 6, backgroundColor: '#064E3B', height: 75, width: '92%', borderRadius: 12 }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF'
      }}
      text2Style={{
        fontSize: 13,
        fontWeight: '600',
        color: '#D1FAE5'
      }}
      text2NumberOfLines={2}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: '#EF4444', borderLeftWidth: 6, backgroundColor: '#7F1D1D', minHeight: 75, height: 'auto', width: '92%', borderRadius: 12, paddingVertical: 10 }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF'
      }}
      text2Style={{
        fontSize: 13,
        fontWeight: '600',
        color: '#FEE2E2'
      }}
      text2NumberOfLines={3}
    />
  )
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
                <OfflineFallback>
                  <AppNavigator
                    onRouteChange={(routeName: string) => setCurrentRoute(routeName)}
                  />
                </OfflineFallback>
                {showChatbot && <HostelChatbot />}
                <Toast config={toastConfig} />
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
