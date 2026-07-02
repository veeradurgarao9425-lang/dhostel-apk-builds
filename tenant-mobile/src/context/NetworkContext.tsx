import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';

interface NetworkContextValue {
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

const NetworkContext = createContext<NetworkContextValue>({
  isConnected: true,
  isInternetReachable: true,
});

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);
  const prevConnected = useRef(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      const connected = state.isConnected ?? false;
      const reachable = state.isInternetReachable ?? null;

      setIsConnected(connected);
      setIsInternetReachable(reachable);

      if (prevConnected.current && !connected) {
        Toast.show({
          type: 'offline',
          text1: 'No Internet',
          text2: 'You are offline. Some features may not work.',
          visibilityTime: 4000,
          autoHide: true,
        });
      } else if (!prevConnected.current && connected) {
        Toast.show({
          type: 'online',
          text1: 'Back Online',
          text2: 'Your internet connection has been restored.',
          visibilityTime: 3000,
          autoHide: true,
        });
      }
      prevConnected.current = connected;
    });

    return () => unsub();
  }, []);

  return (
    <NetworkContext.Provider value={{ isConnected, isInternetReachable }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
export default NetworkContext;
