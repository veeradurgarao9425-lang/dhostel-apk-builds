import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';

// ─── App-wide Error Boundary ──────────────────────────────────────────────────
// Catches any render-time crash in the tree below it and shows a friendly
// recovery screen instead of a white screen of death. This is the single most
// important safety net for "never breaks" behaviour.

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Hook for Sentry/Crashlytics later. Keep a single console for dev only.
    if (__DEV__) {
      console.error('ErrorBoundary caught:', error, info.componentStack);
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
    marginBottom: 28,
  },
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
