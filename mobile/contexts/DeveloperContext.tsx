import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { developerService, DeveloperUser, SupportSessionState } from '../src/services/developerService';
import { setSecureItem, getSecureItem, removeSecureItem } from '../src/services/secureStore';
import api from '../src/services/api';
import { useAuth } from './AuthContext';
import { navigate, reset } from '../src/navigation/navigationRef';

interface DeveloperContextType {
  developer: DeveloperUser | null;
  developerToken: string | null;
  isDeveloperLoggedIn: boolean;
  supportSession: SupportSessionState | null;
  loading: boolean;
  login: (identifier: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  enterSupportMode: (params: {
    target_user_id: number;
    target_role: 'OWNER' | 'TENANT';
    hostel_id?: number;
    reason?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  exitSupportMode: () => Promise<void>;
}

const DeveloperContext = createContext<DeveloperContextType>({
  developer: null,
  developerToken: null,
  isDeveloperLoggedIn: false,
  supportSession: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  enterSupportMode: async () => ({ success: false }),
  exitSupportMode: async () => {},
});

export const useDeveloper = () => useContext(DeveloperContext);

export const DeveloperProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [developer, setDeveloper] = useState<DeveloperUser | null>(null);
  const [developerToken, setDeveloperToken] = useState<string | null>(null);
  const [supportSession, setSupportSession] = useState<SupportSessionState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { updateTokenAndUser, signOut } = useAuth();

  // Load existing developer session or active support session from storage
  useEffect(() => {
    const initDev = async () => {
      try {
        const storedDevToken = await getSecureItem('developer_token');
        const storedDevUser = await AsyncStorage.getItem('developer_user');
        const storedSupport = await AsyncStorage.getItem('support_session');

        if (storedDevToken && storedDevUser) {
          setDeveloperToken(storedDevToken);
          setDeveloper(JSON.parse(storedDevUser));
        }

        if (storedSupport) {
          const parsedSupport: SupportSessionState = JSON.parse(storedSupport);
          // Check if session has not expired
          if (new Date(parsedSupport.expiresAt).getTime() > Date.now()) {
            setSupportSession(parsedSupport);
          } else {
            await AsyncStorage.removeItem('support_session');
          }
        }
      } catch (err) {
        console.warn('Error restoring developer state:', err);
      } finally {
        setLoading(false);
      }
    };

    initDev();
  }, []);

  // Developer Login
  const login = async (identifier: string, pass: string) => {
    try {
      const res = await developerService.login(identifier, pass);
      if (res?.success && res.data) {
        const devUser = res.data.developer;
        const token = res.data.token;

        setDeveloper(devUser);
        setDeveloperToken(token);

        await setSecureItem('developer_token', token);
        await AsyncStorage.setItem('developer_user', JSON.stringify(devUser));

        return { success: true };
      }
      return { success: false, error: res?.error || 'Authentication failed' };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Login failed',
      };
    }
  };

  // Developer Logout
  const logout = async () => {
    try {
      if (developerToken) {
        await developerService.logout(developerToken);
      }
    } catch {}

    setDeveloper(null);
    setDeveloperToken(null);
    setSupportSession(null);

    await removeSecureItem('developer_token');
    await AsyncStorage.multiRemove(['developer_user', 'support_session']);
    navigate('RoleSelect');
  };

  // Enter Delegated Support Mode
  const enterSupportMode = async (params: {
    target_user_id: number;
    target_role: 'OWNER' | 'TENANT';
    hostel_id?: number;
    reason?: string;
  }) => {
    try {
      const res = await developerService.createSupportSession(params);
      if (res?.success && res.data) {
        const { support_session_id, token, expires_at, target_user, target_role, hostel_name } = res.data;

        const sessionData: SupportSessionState = {
          isSupportMode: true,
          sessionId: support_session_id,
          originalDeveloperToken: developerToken || '',
          targetUser: target_user,
          targetRole: target_role,
          hostelName: hostel_name,
          expiresAt: expires_at,
        };

        setSupportSession(sessionData);
        await AsyncStorage.setItem('support_session', JSON.stringify(sessionData));

        // Inject delegated token and user into AuthContext and Axios
        await updateTokenAndUser(token, target_user);

        // Navigate to the appropriate user dashboard
        navigate('Main');

        return { success: true };
      }
      return { success: false, error: res?.error || 'Could not start support session' };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Support mode error',
      };
    }
  };

  // Exit Delegated Support Mode
  const exitSupportMode = async () => {
    try {
      if (supportSession?.sessionId) {
        await developerService.exitSupportSession(supportSession.sessionId);
      }
    } catch (e) {
      console.warn('Exit support session API notice:', e);
    }

    setSupportSession(null);
    await AsyncStorage.removeItem('support_session');

    // Restore developer auth header
    if (developerToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${developerToken}`;
    }

    // Clear normal user session
    await signOut();

    // Navigate smoothly back to Developer Dashboard
    navigate('DeveloperDashboard');
  };

  return (
    <DeveloperContext.Provider
      value={{
        developer,
        developerToken,
        isDeveloperLoggedIn: !!developer && !!developerToken,
        supportSession,
        loading,
        login,
        logout,
        enterSupportMode,
        exitSupportMode,
      }}
    >
      {children}
    </DeveloperContext.Provider>
  );
};
