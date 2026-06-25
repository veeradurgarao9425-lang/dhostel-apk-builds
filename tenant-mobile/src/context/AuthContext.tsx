import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

type TenantUser = {
  id: string | number;
  name: string;
  email: string;
  phone?: string;
  room?: any;
  rent?: number;
  hostel_id?: number;
};

type ConnectedHostel = {
  hostel_id: number;
  hostel_name: string;
};

type AuthContextType = {
  user: TenantUser | null;
  connectedHostel: ConnectedHostel | null;
  loading: boolean;
  connectHostel: (code: string) => Promise<{ error: any; data?: ConnectedHostel }>;
  signInOtp: (emailOrPhone: string) => Promise<{ error: any; message?: string }>;
  verifyOtp: (emailOrPhone: string, otp: string) => Promise<{ error: any; user?: TenantUser }>;
  signOut: () => Promise<void>;
  disconnectHostel: () => Promise<void>;
  updateTokenAndUser: (token: string | null | undefined, updatedFields: Partial<TenantUser>) => Promise<void>;
  logoutLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  connectedHostel: null,
  loading: true,
  connectHostel: async () => ({ error: null }),
  signInOtp: async () => ({ error: null }),
  verifyOtp: async () => ({ error: null }),
  signOut: async () => {},
  disconnectHostel: async () => {},
  updateTokenAndUser: async () => {},
  logoutLoading: false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<TenantUser | null>(null);
  const [connectedHostel, setConnectedHostel] = useState<ConnectedHostel | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const [[, storedUser], [, storedToken], [, storedHostel]] = await AsyncStorage.multiGet(['user', 'token', 'connected_hostel']);

        if (storedHostel) {
          setConnectedHostel(JSON.parse(storedHostel));
        }

        if (storedUser && storedToken) {
          const parsedUser = JSON.parse(storedUser);
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          setUser(parsedUser);
        }
      } catch (error) {
        if (__DEV__) console.error('Failed to load auth state from storage', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const connectHostel = async (code: string) => {
    try {
      const response = await api.post('/auth/tenant/verify-hostel', { hostel_code: code });
      if (response.data?.success) {
        const hostelData = response.data.data;
        setConnectedHostel(hostelData);
        await AsyncStorage.setItem('connected_hostel', JSON.stringify(hostelData));
        return { error: null, data: hostelData };
      }
      return { error: response.data?.error || 'Failed to verify hostel key' };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Network error';
      return { error: errorMessage };
    }
  };

  const signInOtp = async (emailOrPhone: string) => {
    if (!connectedHostel?.hostel_id) {
      return { error: 'Please connect to a hostel first.' };
    }
    try {
      const response = await api.post('/auth/tenant/send-otp', { 
        identifier: emailOrPhone,
        hostel_id: connectedHostel.hostel_id
      });
      if (response.data?.success || response.status === 200) {
        return { error: null, message: response.data?.message || 'OTP sent' };
      }
      return { error: response.data?.error || response.data?.message || 'Failed to send OTP' };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Network error';
      return { error: errorMessage };
    }
  };

  const verifyOtp = async (emailOrPhone: string, otp: string) => {
    if (!connectedHostel?.hostel_id) {
      return { error: 'Please connect to a hostel first.' };
    }
    try {
      const response = await api.post('/auth/tenant/verify-otp', { 
        identifier: emailOrPhone, 
        otp,
        hostel_id: connectedHostel.hostel_id 
      });
      const body = response.data;
      const token = body?.data?.token;
      const userData = body?.data?.tenant;

      if (token && userData) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        return { error: null, user: userData };
      }
      return { error: body?.error || body?.message || 'Verification failed' };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Network error';
      return { error: errorMessage };
    }
  };

  const signOut = async () => {
    setLogoutLoading(true);
    try {
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
      // We don't remove connected_hostel here so tenant doesn't have to re-enter it next time!
      await AsyncStorage.multiRemove(['token', 'user']);
    } catch (e) {
      console.error('Error signing out', e);
    } finally {
      setLogoutLoading(false);
    }
  };

  const disconnectHostel = async () => {
    try {
      await signOut(); // also sign out if they disconnect
      setConnectedHostel(null);
      await AsyncStorage.removeItem('connected_hostel');
    } catch (error) {
      console.error('Failed to disconnect hostel', error);
    }
  };

  const updateTokenAndUser = async (token: string | null | undefined, updatedFields: Partial<TenantUser>) => {
    try {
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        await AsyncStorage.setItem('token', token);
      }
      setUser(prev => {
        if (!prev) return null;
        const newUser = { ...prev, ...updatedFields };
        AsyncStorage.setItem('user', JSON.stringify(newUser)).catch(console.error);
        return newUser;
      });
    } catch (error) {
      console.error('Failed to update user', error);
    }
  };

  const value = {
    user,
    connectedHostel,
    loading,
    logoutLoading,
    connectHostel,
    signInOtp,
    verifyOtp,
    signOut,
    disconnectHostel,
    updateTokenAndUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
