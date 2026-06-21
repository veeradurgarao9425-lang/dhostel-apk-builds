import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../src/services/api';
import { notificationService } from '../src/services/notificationService';

type User = {
  user_id: string | number;
  email: string;
  full_name?: string;
  role?: string;
  role_id?: number;
  hostel_id?: number;
  hostel_name?: string;
  phone?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<{ error: any; user?: User }>;
  signOut: () => Promise<void>;
  updateTokenAndUser: (token: string | null | undefined, updatedFields: Partial<User>) => Promise<void>;
  hostels: any[];
  loadHostels: () => Promise<void>;
  cycleHostels: () => Promise<string | undefined>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => { },
  updateTokenAndUser: async () => { },
  hostels: [],
  loadHostels: async () => { },
  cycleHostels: async () => undefined,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hostels, setHostels] = useState<any[]>([]);

  const loadHostels = async () => {
    try {
      const res = await api.get('/hostels');
      if (res.data?.success) {
        setHostels(res.data.data || []);
      }
    } catch (e) {
      console.warn('Failed to load hostels list in AuthContext:', e);
    }
  };

  useEffect(() => {
    // Initializing auth state from storage
    const loadUser = async () => {
      // Hard timeout — if backend is slow, never get stuck on splash
      const timeout = setTimeout(() => {
        console.warn('AuthContext: loadUser timed out after 8s, forcing loading=false');
        setLoading(false);
      }, 8000);

      try {
        const storedUser = await AsyncStorage.getItem('user');
        const storedToken = await AsyncStorage.getItem('token');

        if (storedUser && storedToken) {
          let parsedUser = JSON.parse(storedUser);
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          setUser(parsedUser);

          // Proactively fetch hostel name if missing — with per-request timeout
          if (parsedUser.hostel_id && !parsedUser.hostel_name) {
            try {
              const res = await Promise.race([
                api.get(`/hostels/${parsedUser.hostel_id}`),
                new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))
              ]) as any;
              if (res.data?.success && res.data?.data?.hostel_name) {
                parsedUser = { ...parsedUser, hostel_name: res.data.data.hostel_name };
                setUser(parsedUser);
                await AsyncStorage.setItem('user', JSON.stringify(parsedUser));
              }
            } catch (e) {
              console.warn('Failed to load hostel details in AuthContext:', e);
            }
          }

          // Fetch all user hostels — with per-request timeout
          try {
            const res = await Promise.race([
              api.get('/hostels'),
              new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))
            ]) as any;
            if (res.data?.success) {
              setHostels(res.data.data || []);
            }
          } catch (e) {
            console.warn('Failed to load hostels list in AuthContext loadUser:', e);
          }
        }
      } catch (error) {
        console.error('Failed to load user from storage', error);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };

    loadUser();
  }, []);


  const signIn = async (identifier: string, password: string) => {
    try {
      console.log('Mobile - Attempting Login:', identifier);
      const response = await api.post('/auth/login', { identifier, password });

      // Extract data with maximum flexibility
      const contentType = response.headers['content-type'];
      if (contentType && !contentType.includes('application/json')) {
        console.warn('Mobile - Received HTML instead of JSON. Check backend port.');
        return { error: 'Server configuration error: Received HTML instead of JSON.' };
      }

      const body = response.data;
      const token = body?.token || body?.data?.token || body?.accessToken;
      const userData = body?.user || body?.data?.user || body?.profile;

      if (response.status === 200 && token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        let finalUser = userData || { email: identifier, user_id: 'unknown' };
        
        // Fetch hostel details if missing
        if (finalUser.hostel_id && !finalUser.hostel_name) {
          try {
            const res = await api.get(`/hostels/${finalUser.hostel_id}`);
            if (res.data?.success && res.data?.data?.hostel_name) {
              finalUser = { ...finalUser, hostel_name: res.data.data.hostel_name };
            }
          } catch (e) {
            console.warn('Failed to load hostel details in signIn:', e);
          }
        }
        
        setUser(finalUser);

        // Persist data
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(finalUser));

        // Fetch all user hostels
        try {
          const res = await api.get('/hostels');
          if (res.data?.success) {
            setHostels(res.data.data || []);
          }
        } catch (e) {
          console.warn('Failed to load hostels list in AuthContext signIn:', e);
        }

        console.log('Mobile - Login Success');

        // Register for push notifications
        try {
          const pushToken = await notificationService.registerForPushNotificationsAsync();
          if (pushToken) {
            await notificationService.sendTokenToBackend(pushToken);
          }
        } catch (e) {
          console.error('Notification setup failed:', e);
        }

        return { error: null, user: userData };

      } else {
        const errorMessage = body?.error || body?.message || 'Authentication failed.';
        console.warn('Mobile - Login Rejected:', errorMessage);
        return { error: errorMessage };
      }
    } catch (error: any) {
      console.error('Mobile - Request Failed:', error.message);
      const targetUrl = api.defaults.baseURL;
      const errorMessage = error.response?.data?.error || error.response?.data?.message || `Cannot reach server at ${targetUrl}. Check WiFi/Firewall.`;
      return { error: errorMessage };
    }
  };

  const signOut = async () => {
    try {
      const pushToken = await notificationService.registerForPushNotificationsAsync();
      if (pushToken) {
        await notificationService.removeTokenFromBackend(pushToken);
      }

      delete api.defaults.headers.common['Authorization'];
      setUser(null);
      setHostels([]);
      await AsyncStorage.multiRemove(['token', 'user']);
    } catch (e) {
      console.error('Error signing out', e);
    }
  };

  const updateTokenAndUser = async (token: string | null | undefined, updatedFields: Partial<User>) => {
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
      console.error('Failed to update token and user in AuthContext', error);
    }
  };

  const cycleHostels = async () => {
    let activeHostels = hostels;
    if (activeHostels.length === 0) {
      try {
        const res = await api.get('/hostels');
        if (res.data?.success) {
          activeHostels = res.data.data || [];
          setHostels(activeHostels);
        }
      } catch (e) {
        console.warn('Failed to lazy load hostels in cycleHostels:', e);
      }
    }

    if (activeHostels.length < 2) {
      return undefined;
    }

    const currentIndex = activeHostels.findIndex(h => h.hostel_id === user?.hostel_id);
    const nextIndex = (currentIndex + 1) % activeHostels.length;
    const nextHostel = activeHostels[nextIndex];

    if (nextHostel) {
      try {
        const res = await api.put('/auth/active-hostel', { hostel_id: nextHostel.hostel_id });
        if (res.data?.success) {
          const { token, hostel_name } = res.data.data;
          await updateTokenAndUser(token, { hostel_id: nextHostel.hostel_id, hostel_name });
          return hostel_name;
        }
      } catch (err) {
        console.error('Failed to cycle active hostel:', err);
        throw err;
      }
    }
    return undefined;
  };

  const value = {
    user,
    loading,
    signIn,
    signOut,
    updateTokenAndUser,
    hostels,
    loadHostels,
    cycleHostels,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
