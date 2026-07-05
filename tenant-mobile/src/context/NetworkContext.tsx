/**
 * NetworkContext — tenant-mobile
 *
 * Provides:
 *  - isConnected / isInternetReachable booleans
 *  - isSlowConnection — true when type is 2g/3g or effectiveType <= 2g
 *  - wasOffline — true if we went offline at any point this session (for auto-retry hints)
 *
 * Shows:
 *  - Toast on disconnect / reconnect (existing behaviour, kept)
 *  - <NetworkBanner> — an animated top banner that appears whenever offline
 *    and shows a "Reconnecting…" pulse while it tries to come back
 */
import React, {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import {
  Animated, StyleSheet, Text, TouchableOpacity, View, Platform,
} from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';

// ─── Types ────────────────────────────────────────────────────────────────────
interface NetworkContextValue {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  isSlowConnection: boolean;
  wasOffline: boolean;
  recheckNow: () => void;
}

const NetworkContext = createContext<NetworkContextValue>({
  isConnected: true,
  isInternetReachable: true,
  isSlowConnection: false,
  wasOffline: false,
  recheckNow: () => {},
});

// ─── Slow connection detection ────────────────────────────────────────────────
function isSlow(state: NetInfoState): boolean {
  const type = state.type;
  if (type === 'none' || type === 'unknown') return false;
  if (type === 'cellular') {
    const gen = (state.details as any)?.cellularGeneration;
    return gen === '2g' || gen === '3g';
  }
  if (type === 'wifi') {
    // If isInternetReachable is null for too long, treat as slow
    return state.isInternetReachable === null;
  }
  return false;
}

// ─── NetworkBanner ────────────────────────────────────────────────────────────
function NetworkBanner({
  visible,
  isReconnecting,
  onRetry,
}: {
  visible: boolean;
  isReconnecting: boolean;
  onRetry: () => void;
}) {
  const slideY = useRef(new Animated.Value(-80)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(slideY, {
      toValue: visible ? 0 : -80,
      useNativeDriver: true,
      tension: 70,
      friction: 10,
    }).start();
  }, [visible]);

  // Pulse animation for "reconnecting" state
  useEffect(() => {
    if (isReconnecting) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isReconnecting]);

  if (!visible && slideY._value === -80) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { transform: [{ translateY: slideY }] },
      ]}
    >
      <View style={styles.bannerLeft}>
        {/* Animated dot */}
        <Animated.View style={[styles.statusDot, { opacity: pulseAnim }]} />
        <Text style={styles.bannerText}>
          {isReconnecting ? 'Reconnecting…' : 'No Internet Connection'}
        </Text>
      </View>
      {!isReconnecting && (
        <TouchableOpacity onPress={onRetry} style={styles.retryChip} activeOpacity={0.7}>
          <Text style={styles.retryChipText}>Retry</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const prevConnected = useRef(true);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recheckNow = useCallback(() => {
    setIsReconnecting(true);
    NetInfo.fetch().then((state) => {
      const connected = state.isConnected ?? false;
      const reachable = state.isInternetReachable ?? null;
      setIsConnected(connected);
      setIsInternetReachable(reachable);
      setIsReconnecting(false);
      if (connected) {
        setBannerVisible(false);
      }
    });
  }, []);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const connected = state.isConnected ?? false;
      const reachable = state.isInternetReachable ?? null;
      const slow = isSlow(state);

      setIsConnected(connected);
      setIsInternetReachable(reachable);
      setIsSlowConnection(slow);

      // ── went offline ──
      if (prevConnected.current && !connected) {
        setWasOffline(true);
        setBannerVisible(true);
        setIsReconnecting(false);
        Toast.show({
          type: 'offline',
          text1: 'No Internet',
          text2: 'You are offline. Some features may not work.',
          visibilityTime: 4000,
          autoHide: true,
        });
      }

      // ── came back online ──
      if (!prevConnected.current && connected) {
        // Show "reconnecting" state briefly, then hide
        setIsReconnecting(true);
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(() => {
          setBannerVisible(false);
          setIsReconnecting(false);
          Toast.show({
            type: 'online',
            text1: 'Back Online',
            text2: 'Your connection has been restored.',
            visibilityTime: 3000,
            autoHide: true,
          });
        }, 1800);
      }

      // ── slow connection toast (only once per transition) ──
      if (slow && !isSlowConnection) {
        Toast.show({
          type: 'warning',
          text1: 'Slow Connection',
          text2: 'Your internet is slow. Loading may take longer.',
          visibilityTime: 3500,
          autoHide: true,
        });
      }

      prevConnected.current = connected;
    });

    return () => {
      unsub();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [isSlowConnection]);

  return (
    <NetworkContext.Provider
      value={{ isConnected, isInternetReachable, isSlowConnection, wasOffline, recheckNow }}
    >
      {/* Banner sits above everything */}
      <NetworkBanner
        visible={bannerVisible}
        isReconnecting={isReconnecting}
        onRetry={recheckNow}
      />
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
export default NetworkContext;

// ─── Styles ───────────────────────────────────────────────────────────────────
const BANNER_TOP = Platform.OS === 'ios' ? 50 : 36;

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: BANNER_TOP,
    left: 16,
    right: 16,
    zIndex: 99999,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 20,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    flexShrink: 0,
  },
  bannerText: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  retryChip: {
    backgroundColor: '#2245D4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginLeft: 10,
  },
  retryChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
