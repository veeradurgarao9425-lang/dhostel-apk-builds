import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import { HostelChatbot } from './src/components/HostelChatbot';
import { ToastProvider } from './src/context/ToastContext';
import { OfflineFallback } from './src/components/OfflineFallback';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { queryClient } from './src/lib/queryClient';

import './src/i18n';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<string | undefined>(undefined);

  // Show chatbot on all authenticated screens; hide only on Splash & Login
  const showChatbot = !!currentRoute && currentRoute !== 'Splash' && currentRoute !== 'Login';

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <SafeAreaProvider style={styles.container}>
                <OfflineFallback>
                  <AppNavigator
                    onRouteChange={(routeName: string) => setCurrentRoute(routeName)}
                  />
                </OfflineFallback>
                {showChatbot && <HostelChatbot />}
                <Toast />
              </SafeAreaProvider>
            </ToastProvider>
          </ThemeProvider>
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
