import React, { useEffect, useState, useRef, createContext, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  AppStateStatus,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';

export const APP_LOCK_STORAGE_KEY = 'HOSTIX_APP_LOCK_ENABLED';
const LOCK_GRACE_PERIOD_MS = 30000; // 30-second grace window for quick app switches

interface AppLockContextType {
  isAppLockEnabled: boolean;
  setAppLock: (enabled: boolean) => Promise<boolean>;
  isLocked: boolean;
  unlockApp: () => Promise<boolean>;
  hasBiometrics: boolean;
}

const AppLockContext = createContext<AppLockContextType>({
  isAppLockEnabled: false,
  setAppLock: async () => false,
  isLocked: false,
  unlockApp: async () => false,
  hasBiometrics: false,
});

export const useAppLock = () => useContext(AppLockContext);

export const AppLockGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAppLockEnabled, setIsAppLockEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const appState = useRef(AppState.currentState);
  const lockPromptTimeout = useRef<any>(null);
  const lastBackgroundedAt = useRef<number | null>(null);

  const promptUnlock = async (): Promise<boolean> => {
    if (authenticating) return false;
    setAuthenticating(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Hostix',
        fallbackLabel: 'Use PIN / Pattern',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsLocked(false);
        setAuthenticating(false);
        lastBackgroundedAt.current = null;
        return true;
      }
    } catch (err) {
      console.warn('[AppLock] Authentication error:', err);
    } finally {
      setAuthenticating(false);
    }
    return false;
  };

  // Initialize lock state from storage synchronously before rendering lock gate
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        const [hasHardware, isEnrolled, stored] = await Promise.all([
          LocalAuthentication.hasHardwareAsync().catch(() => false),
          LocalAuthentication.isEnrolledAsync().catch(() => false),
          AsyncStorage.getItem(APP_LOCK_STORAGE_KEY).catch(() => null),
        ]);
        if (!isMounted) return;
        setHasBiometrics(hasHardware && isEnrolled);

        if (stored === 'true' && hasHardware && isEnrolled) {
          setIsAppLockEnabled(true);
          setIsLocked(true);
          // Trigger native OS bottom drawer immediately on cold start
          lockPromptTimeout.current = setTimeout(() => {
            promptUnlock();
          }, 150);
        } else {
          setIsAppLockEnabled(false);
          setIsLocked(false);
        }
      } catch (err) {
        console.warn('[AppLock] Init error:', err);
      }
    };
    init();
    return () => {
      isMounted = false;
      if (lockPromptTimeout.current) clearTimeout(lockPromptTimeout.current);
    };
  }, []);

  // Listen for app going to background and returning to active with grace period
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState.match(/inactive|background/)) {
        // App went to background - record timestamp
        lastBackgroundedAt.current = Date.now();
      } else if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App returned to foreground - check if grace timeout elapsed
        const now = Date.now();
        const elapsed = lastBackgroundedAt.current ? now - lastBackgroundedAt.current : Infinity;

        if (elapsed > LOCK_GRACE_PERIOD_MS) {
          AsyncStorage.getItem(APP_LOCK_STORAGE_KEY).then((stored) => {
            if (stored === 'true') {
              setIsLocked(true);
              setTimeout(() => {
                promptUnlock();
              }, 100);
            }
          }).catch(() => {});
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isAppLockEnabled]);

  const setAppLock = async (enabled: boolean): Promise<boolean> => {
    try {
      if (enabled) {
        // Verify biometric/PIN before enabling
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to Enable App Lock',
          fallbackLabel: 'Use Device PIN / Passcode',
          cancelLabel: 'Cancel',
          disableDeviceFallback: false,
        });
        if (!result.success) {
          return false;
        }
      }

      await AsyncStorage.setItem(APP_LOCK_STORAGE_KEY, enabled ? 'true' : 'false');
      setIsAppLockEnabled(enabled);
      if (!enabled) {
        setIsLocked(false);
      }
      return true;
    } catch (err) {
      console.warn('[AppLock] Set lock error:', err);
      return false;
    }
  };

  return (
    <AppLockContext.Provider
      value={{
        isAppLockEnabled,
        setAppLock,
        isLocked,
        unlockApp: promptUnlock,
        hasBiometrics,
      }}
    >
      <View style={{ flex: 1, opacity: isLocked ? 0.35 : 1 }} pointerEvents={isLocked ? 'none' : 'auto'}>
        {children}
      </View>
      {isLocked && (
        <View style={styles.lockOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={promptUnlock}
          />
          <View style={styles.contentCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed" size={26} color="#7C3AED" />
            </View>

            <Text style={styles.appName}>Hostix is Locked</Text>
            <Text style={styles.lockSubtitle}>Authentication is required to access the app</Text>

            <TouchableOpacity
              style={styles.unlockButton}
              onPress={promptUnlock}
              activeOpacity={0.8}
              disabled={authenticating}
            >
              {authenticating ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="finger-print" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.unlockButtonText}>Unlock App</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </AppLockContext.Provider>
  );
};

const styles = StyleSheet.create({
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    zIndex: 999999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  appName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  lockSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: '100%',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  unlockButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
