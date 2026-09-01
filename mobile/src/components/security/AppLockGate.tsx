import React, { createContext, useContext } from 'react';

export const APP_LOCK_STORAGE_KEY = 'HOSTIX_APP_LOCK_ENABLED';

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
  unlockApp: async () => true,
  hasBiometrics: false,
});

export const useAppLock = () => useContext(AppLockContext);

export const AppLockGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AppLockContext.Provider
      value={{
        isAppLockEnabled: false,
        setAppLock: async () => false,
        isLocked: false,
        unlockApp: async () => true,
        hasBiometrics: false,
      }}
    >
      {children}
    </AppLockContext.Provider>
  );
};
