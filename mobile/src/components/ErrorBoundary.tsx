import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── App-wide Error Boundary ──────────────────────────────────────────────────
// Catches any render-time crash in the tree below it and shows a friendly
// recovery screen instead of a white screen of death. This is the single most
// important safety net for "never breaks" behaviour.
//
// In production, crash details are forwarded to /api/activity so they surface
// in the owner dashboard — no Sentry needed right now. Add Sentry later by
// calling Sentry.captureException(error) alongside the fetch below.

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error: Error | null };

async function reportCrashToBackend(error: Error, componentStack: string | null | undefined) {
  try {
    const rawUrl = process.env.EXPO_PUBLIC_API_URL || '';
    const API_URL = (rawUrl.includes('192.168.') ? rawUrl : (rawUrl || 'https://api.143-244-131-69.sslip.io/api')).replace(/\/$/, '');

    // Read auth token from storage — best-effort, no throw
    const token = await AsyncStorage.getItem('authToken').catch(() => null);

    await fetch(`${API_URL}/api/activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        type: 'CRASH',
        description: `[ErrorBoundary] ${error?.message || 'Unknown error'}`,
        metadata: {
          stack: error?.stack?.slice(0, 1000) ?? null,
          componentStack: componentStack?.slice(0, 500) ?? null,
          ts: new Date().toISOString(),
        },
      }),
    });
  } catch {
    // Swallow — crash reporter must never crash the crash reporter
  }
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (__DEV__) {
      // Full details in Metro console during development
      console.error('ErrorBoundary caught:', error, info.componentStack);
    } else {
      // In production: forward to backend so crashes are visible in the dashboard.
      // Replace with Sentry.captureException(error) when Sentry is integrated.
      reportCrashToBackend(error, info.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.root}>
          <StatusBar barStyle="dark-content" />
          <Text style={styles.emoji}>🛠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.sub}>
            The app hit an unexpected error. Your data is safe — just tap below to
            continue.
          </Text>
          {__DEV__ && this.state.error && (
            <ScrollView style={styles.devBox} contentContainerStyle={{ padding: 12 }}>
              <Text style={styles.devText}>{this.state.error.message}</Text>
              {this.state.error.stack && (
                <Text style={styles.devStack}>{this.state.error.stack.slice(0, 600)}</Text>
              )}
            </ScrollView>
          )}
          <TouchableOpacity style={styles.btn} onPress={this.handleReset} activeOpacity={0.85}>
            <Text style={styles.btnText}>↺  Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#F8FAFC',
  },
  emoji: { fontSize: 52, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#1A1A2E', marginBottom: 8 },
  sub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 16,
  },
  devBox: {
    maxHeight: 160,
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: 16,
  },
  devText: { fontSize: 12, color: '#991B1B', fontWeight: '700', marginBottom: 4 },
  devStack: { fontSize: 10, color: '#B91C1C', fontFamily: 'monospace' },
  btn: {
    backgroundColor: '#5F2EEA',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 14,
    elevation: 3,
    shadowColor: '#5F2EEA',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  btnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
});

export default ErrorBoundary;

