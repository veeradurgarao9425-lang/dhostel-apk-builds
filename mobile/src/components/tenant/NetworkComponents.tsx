import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Wifi, WifiOff, AlertTriangle, RefreshCw, CheckCircle, Server, Wrench, X, Activity } from 'lucide-react-native';
import { Theme, PrimaryButton, SecondaryButton } from './UIComponents';
import { BaseBottomSheet } from './UIComponents';
import { useNetwork } from '../context/NetworkContext';

export type NetworkStateType = 
  | 'offline' | 'poor' | 'reconnecting' | 'slow' | 'online' 
  | 'syncing' | 'sync_success' | 'sync_failed' | 'maintenance' | 'server_error';

export function NetworkStateScreen({ state, onRetry, onSecondary }: { state: NetworkStateType, onRetry?: () => void, onSecondary?: () => void }) {
  const getProps = () => {
    switch (state) {
      case 'offline': return { icon: WifiOff, color: Theme.error, title: 'You are Offline', desc: 'No internet connection. Please check your connection and try again.', primary: 'Retry', secondary: 'Work Offline' };
      case 'poor': return { icon: AlertTriangle, color: Theme.warning, title: 'Poor connection. Some actions may take longer.', desc: 'You can continue, but some data may take time to sync.', primary: 'Continue', secondary: 'Cancel' };
      case 'reconnecting': return { icon: RefreshCw, color: Theme.primary, title: 'Reconnecting...', desc: 'Trying to restore your connection.\nPlease don\'t close the app.', spin: true };
      case 'slow': return { icon: Activity, color: Theme.info, title: 'Slow Network', desc: 'Your internet speed is slow.\nSome content may load slowly.', primary: 'Proceed Anyway' };
      case 'online': return { icon: CheckCircle, color: Theme.success, title: 'You\'re Back Online!', desc: 'Your connection is restored.\nAll data is now up to date.', primary: 'Refresh' };
      case 'syncing': return { icon: RefreshCw, color: Theme.primary, title: 'Syncing Your Data', desc: 'Please wait while we update your latest information.', spin: true };
      case 'sync_success': return { icon: CheckCircle, color: Theme.success, title: 'Data Synced Successfully', desc: 'All your data is up to date.', primary: 'Great!' };
      case 'sync_failed': return { icon: AlertTriangle, color: Theme.error, title: 'Sync Failed', desc: 'We couldn\'t update your data.\nPlease try again.', primary: 'Retry', secondary: 'Try Later' };
      case 'maintenance': return { icon: Wrench, color: Theme.warning, title: 'We\'ll be back soon!', desc: 'The app is under maintenance. We apologize for the inconvenience.\n\nExpected downtime\nToday, 12:00 AM - 02:00 AM', primary: 'Check Again Later' };
      case 'server_error': return { icon: Server, color: Theme.error, title: 'Something went wrong!', desc: 'Our servers are facing some issues. Please try again in a few minutes.', primary: 'Retry', secondary: 'Contact Support' };
    }
  };

  const p = getProps();
  const Icon = p.icon;

  const spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (p.spin) {
      Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 1500, useNativeDriver: true })).start();
    } else {
      spinAnim.stopAnimation();
    }
  }, [p.spin]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.container}>
      <View style={[styles.iconBox, { backgroundColor: p.color + '15' }]}>
        <Animated.View style={{ transform: [{ rotate: p.spin ? spin : '0deg' }] }}>
          <Icon size={48} color={p.color} />
        </Animated.View>
      </View>
      <Text style={styles.title}>{p.title}</Text>
      <Text style={styles.desc}>{p.desc}</Text>
      
      {p.primary && <PrimaryButton label={p.primary} onPress={onRetry} style={styles.btn} />}
      {p.secondary && <SecondaryButton label={p.secondary} onPress={onSecondary} style={styles.btn} />}
    </View>
  );
}

export function NetworkBanner({ type, onClose }: { type: 'offline' | 'reconnecting' | 'online', onClose?: () => void }) {
  const getProps = () => {
    if (type === 'offline') return { icon: WifiOff, color: Theme.error, bg: '#FEF2F2', title: 'You are offline', desc: 'Some features are not available' };
    if (type === 'reconnecting') return { icon: RefreshCw, color: Theme.primary, bg: '#EFF6FF', title: 'Reconnecting...', desc: 'Please wait', spin: true };
    return { icon: CheckCircle, color: Theme.success, bg: '#F0FDF4', title: 'Back online', desc: 'Your connection is restored' };
  };
  
  const p = getProps();
  const Icon = p.icon;
  
  return (
    <View style={[styles.banner, { backgroundColor: p.bg }]}>
      <Icon size={20} color={p.color} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.bannerTitle, { color: p.color }]}>{p.title}</Text>
        <Text style={styles.bannerDesc}>{p.desc}</Text>
      </View>
      {onClose && (
        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
          <X size={16} color={p.color} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export function OfflineBanner() {
  const { isConnected } = useNetwork();
  if (isConnected) return null;
  return <NetworkBanner type="offline" />;
}

export function ConnectionIndicatorRow({ status }: { status: 'Excellent' | 'Good' | 'Poor' | 'Offline' }) {
  const getProps = () => {
    if (status === 'Excellent') return { color: Theme.success, desc: 'Strong connection' };
    if (status === 'Good') return { color: Theme.warning, desc: 'Stable connection' };
    if (status === 'Poor') return { color: '#F97316', desc: 'Slow connection' };
    return { color: Theme.error, desc: 'No internet connection' };
  };
  const p = getProps();
  return (
    <View style={styles.connRow}>
      <Wifi size={24} color={p.color} />
      <View style={{ flex: 1, marginLeft: 16 }}>
        <Text style={styles.connTitle}>{status}</Text>
        <Text style={styles.connDesc}>{p.desc}</Text>
      </View>
    </View>
  );
}

export function RetryActionSheet({ visible, onClose }: { visible: boolean, onClose: () => void }) {
  return (
    <BaseBottomSheet visible={visible} onClose={onClose} height={320}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: Theme.text, marginBottom: 16 }}>Connection Options</Text>
      
      <TouchableOpacity style={styles.sheetRow} onPress={onClose}>
        <RefreshCw size={20} color={Theme.text} />
        <View style={{ marginLeft: 16 }}>
          <Text style={styles.sheetTitle}>Retry Now</Text>
          <Text style={styles.sheetDesc}>Try to connect again</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.sheetRow} onPress={onClose}>
        <Activity size={20} color={Theme.text} />
        <View style={{ marginLeft: 16 }}>
          <Text style={styles.sheetTitle}>Check Connection</Text>
          <Text style={styles.sheetDesc}>Run connection diagnosis</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.sheetRow} onPress={onClose}>
        <WifiOff size={20} color={Theme.text} />
        <View style={{ marginLeft: 16 }}>
          <Text style={styles.sheetTitle}>Go Offline</Text>
          <Text style={styles.sheetDesc}>Continue in offline mode</Text>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.sheetRow, { borderBottomWidth: 0, justifyContent: 'center', marginTop: 8 }]} onPress={onClose}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: Theme.error }}>Cancel</Text>
      </TouchableOpacity>
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', padding: 24, minHeight: 400, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginVertical: 8 },
  iconBox: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 12, textAlign: 'center' },
  desc: { fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  btn: { width: '100%', marginBottom: 12 },
  
  banner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 16 },
  bannerTitle: { fontSize: 14, fontWeight: '700' },
  bannerDesc: { fontSize: 12, color: '#64748B', marginTop: 2 },
  
  connRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  connTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  connDesc: { fontSize: 13, color: '#64748B' },
  
  sheetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  sheetDesc: { fontSize: 13, color: '#64748B', marginTop: 2 }
});
