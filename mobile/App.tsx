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
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { RefreshProvider } from './contexts/RefreshContext';
import { ConfirmationProvider } from './contexts/ConfirmationContext';

const ThemedToast = () => {
  const { theme, isDark } = useTheme();

  const toastConfig = {
    success: (props: any) => (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: theme.success,
          borderLeftWidth: 6,
          backgroundColor: theme.cardBg,
          minHeight: 75,
          height: 'auto',
          width: '92%',
          borderRadius: 12,
          paddingVertical: 10,
          borderWidth: isDark ? 1 : 0,
          borderColor: isDark ? '#334155' : '#E2E8F0',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4
        }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        text1Style={{
          fontSize: 15,
          fontWeight: '700',
          color: theme.textPrimary
        }}
        text2Style={{
          fontSize: 12,
          fontWeight: '500',
          color: theme.textSecondary
        }}
        text2NumberOfLines={3}
      />
    ),
    error: (props: any) => (
      <ErrorToast
        {...props}
        style={{
          borderLeftColor: theme.error,
          borderLeftWidth: 6,
          backgroundColor: theme.cardBg,
          minHeight: 75,
          height: 'auto',
          width: '92%',
          borderRadius: 12,
          paddingVertical: 10,
          borderWidth: isDark ? 1 : 0,
          borderColor: isDark ? '#334155' : '#E2E8F0',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4
        }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        text1Style={{
          fontSize: 15,
          fontWeight: '700',
          color: theme.textPrimary
        }}
        text2Style={{
          fontSize: 12,
          fontWeight: '500',
          color: theme.textSecondary
        }}
        text2NumberOfLines={3}
      />
    ),
    warning: (props: any) => (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: theme.warning || '#F59E0B',
          borderLeftWidth: 6,
          backgroundColor: theme.cardBg,
          minHeight: 75,
          height: 'auto',
          width: '92%',
          borderRadius: 12,
          paddingVertical: 10,
          borderWidth: isDark ? 1 : 0,
          borderColor: isDark ? '#334155' : '#E2E8F0',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4
        }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        text1Style={{
          fontSize: 15,
          fontWeight: '700',
          color: theme.textPrimary
        }}
        text2Style={{
          fontSize: 12,
          fontWeight: '500',
          color: theme.textSecondary
        }}
        text2NumberOfLines={3}
      />
    ),
    info: (props: any) => (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: theme.primary,
          borderLeftWidth: 6,
          backgroundColor: theme.cardBg,
          minHeight: 75,
          height: 'auto',
          width: '92%',
          borderRadius: 12,
          paddingVertical: 10,
          borderWidth: isDark ? 1 : 0,
          borderColor: isDark ? '#334155' : '#E2E8F0',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4
        }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        text1Style={{
          fontSize: 15,
          fontWeight: '700',
          color: theme.textPrimary
        }}
        text2Style={{
          fontSize: 12,
          fontWeight: '500',
          color: theme.textSecondary
        }}
        text2NumberOfLines={3}
      />
    )
  };

  return <Toast config={toastConfig} />;
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
