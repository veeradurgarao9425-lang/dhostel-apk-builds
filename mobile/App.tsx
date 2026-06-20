import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainerRef } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import { HostelChatbot } from './src/components/HostelChatbot';
import { ToastProvider } from './src/context/ToastContext';
import { OfflineFallback } from './src/components/OfflineFallback';

import './src/i18n';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';

const queryClient = new QueryClient();

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<string | undefined>(undefined);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  // Show chatbot on all authenticated screens; hide only on Splash & Login
  const showChatbot = !!currentRoute && currentRoute !== 'Splash' && currentRoute !== 'Login';

  return (
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
