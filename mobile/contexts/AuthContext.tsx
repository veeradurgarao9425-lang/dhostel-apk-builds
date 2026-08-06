import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../src/services/api';
import { notificationService } from '../src/services/notificationService';

export type User = {
  user_id?: string | number;
  id?: string | number;
  email: string;
  full_name?: string;
  name?: string;
  role?: 'OWNER' | 'TENANT' | 'ADMIN' | string;
  role_id?: number;
  hostel_id?: number;
  hostel_name?: string;
  phone?: string;
  // Tenant specific fields
  gender?: string;
  status?: number;
  is_allocated?: boolean;
  room_id?: number | null;
  room_number?: string | null;
  bed_number?: string | null;
  monthly_rent?: number | null;
  outstanding_due?: number;
  next_due_date?: string | null;
};

export type ConnectedHostel = {
  hostel_id: number;
  hostel_name: string;
  city?: string;
  state?: string;
  address?: string;
};

type AuthContextType = {
  user: User | null;
  connectedHostel: ConnectedHostel | null;
  loading: boolean;
  logoutLoading: boolean;
  hostels: any[];
  hostelsLoading: boolean;
  // Owner Auth
  signIn: (identifier: string, password: string) => Promise<{ error: any; user?: User }>;
  signUp: (payload: { full_name: string; email?: string; phone?: string; password: string; hostel_name?: string; address?: string; admission_fee?: string; default_refundable_deposit?: string }) => Promise<{ error: any; user?: User }>;
  loadHostels: () => Promise<void>;
  cycleHostels: () => Promise<string | undefined>;
  // Tenant Auth
  connectHostel: (code: string) => Promise<{ error: any; data?: ConnectedHostel }>;
  signInOtp: (emailOrPhone: string) => Promise<{ error: any; message?: string }>;
  verifyOtp: (emailOrPhone: string, otp: string) => Promise<{ error: any; user?: User; isNewUser?: boolean; data?: any }>;
  completeTenantRegistration: (token: string, tenantData: Partial<User>) => Promise<void>;
  disconnectHostel: () => Promise<void>;
  refreshUser: () => Promise<void>;
  // Common
  signOut: () => Promise<void>;
  updateTokenAndUser: (token: string | null | undefined, updatedFields: Partial<User>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  connectedHostel: null,
  loading: true,
  logoutLoading: false,
  hostels: [],
  hostelsLoading: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  loadHostels: async () => { },
  cycleHostels: async () => undefined,
  connectHostel: async () => ({ error: null }),
  signInOtp: async () => ({ error: null }),
  verifyOtp: async () => ({ error: null }),
  completeTenantRegistration: async () => { },
  disconnectHostel: async () => { },
  refreshUser: async () => { },
  signOut: async () => { },
  updateTokenAndUser: async () => { },
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
  const [connectedHostel, setConnectedHostel] = useState<ConnectedHostel | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [hostels, setHostels] = useState<any[]>([]);
  const [hostelsLoading, setHostelsLoading] = useState(false);

  const loadHostels = useCallback(async () => {
    try {
      setHostelsLoading(true);
      const res = await api.get('/hostels?my_hostels=true');
      if (res.data?.success) {
        setHostels(res.data.data || []);
      }
    } catch (e: any) {
      if (__DEV__) console.log('Hostels list fetch notice:', e?.message || e);
    } finally {
      setHostelsLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const [[, storedUser], [, storedToken], [, storedHostel]] = await AsyncStorage.multiGet([
          'user',
          'token',
          'connected_hostel',
        ]);

        if (storedHostel) {
          setConnectedHostel(JSON.parse(storedHostel));
        }

        if (storedUser && storedToken) {
          const parsedUser = JSON.parse(storedUser);
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          setUser(parsedUser);

          // Background enrichment for Owner or Tenant
          if (parsedUser.role === 'TENANT' || parsedUser.tenant_id) {
            try {
              const res = await api.get('/auth/tenant/me');
              if (res.data?.data) {
                const fresh = res.data.data;
                const merged = { ...parsedUser, ...fresh, role: 'TENANT' };
                setUser(merged);
                await AsyncStorage.setItem('user', JSON.stringify(merged));
              }
            } catch (e) {
              if (__DEV__) console.warn('Background tenant refresh failed:', e);
            }
          } else {
            await enrichUserInBackground(parsedUser);
          }
        }
      } catch (error) {
        if (__DEV__) console.error('Failed to load user from storage', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const enrichUserInBackground = async (parsedUser: User) => {
    const withTimeout = (p: Promise<any>, ms = 4000) =>
      Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

    if (parsedUser.hostel_id && !parsedUser.hostel_name) {
      try {
        const res: any = await withTimeout(api.get(`/hostels/${parsedUser.hostel_id}`));
        if (res?.data?.success && res.data?.data?.hostel_name) {
          const updated = { ...parsedUser, hostel_name: res.data.data.hostel_name };
          setUser(updated);
          await AsyncStorage.setItem('user', JSON.stringify(updated));
        }
      } catch (e) {
        if (__DEV__) console.warn('Background hostel-detail fetch failed:', e);
      }
    }

    try {
      const res: any = await withTimeout(api.get('/hostels?my_hostels=true'));
      if (res?.data?.success) setHostels(res.data.data || []);
    } catch (e) {
      if (__DEV__) console.warn('Background hostels-list fetch failed:', e);
    }
  };

  // ── Owner Auth Methods ─────────────────────────────────────────────────────
  const signIn = async (identifier: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { identifier, password });

      const contentType = response.headers['content-type'];
      if (contentType && !contentType.includes('application/json')) {
        return { error: 'Server configuration error: Received HTML instead of JSON.' };
      }

      const body = response.data;
      const token = body?.token || body?.data?.token || body?.accessToken;
      let userData = body?.user || body?.data?.user || body?.profile;

      if (response.status === 200 && token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        let finalUser: User = { ...(userData || { email: identifier, user_id: 'unknown' }), role: 'OWNER' };
        
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
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(finalUser));

        try {
          const res = await api.get('/hostels?my_hostels=true');
          if (res.data?.success) {
            setHostels(res.data.data || []);
          }
        } catch (e) {
          console.warn('Failed to load hostels list in signIn:', e);
        }

        try {
          const pushToken = await notificationService.registerForPushNotificationsAsync();
          if (pushToken) {
            await notificationService.sendTokenToBackend(pushToken);
          }
        } catch (e) {
          console.error('Notification setup failed:', e);
        }

        return { error: null, user: finalUser };
      } else {
        const errorMessage = body?.error || body?.message || 'Authentication failed.';
        return { error: errorMessage };
      }
    } catch (error: any) {
      const targetUrl = api.defaults.baseURL;
      const errorMessage = error.response?.data?.error || error.response?.data?.message || `Cannot reach server at ${targetUrl}.`;
      return { error: errorMessage };
    }
  };

  const signUp = async (payload: { full_name: string; email?: string; phone?: string; password: string; hostel_name?: string; address?: string; admission_fee?: string; default_refundable_deposit?: string }) => {
    try {
      const response = await api.post('/auth/register', payload);
      const body = response.data;
      const token = body?.data?.token || body?.token;
      const userData = body?.data?.user || body?.user;

      if ((response.status === 201 || response.status === 200) && token && userData) {
        const finalUser: User = { ...userData, role: 'OWNER' };
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(finalUser);
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(finalUser));

        try {
          const res = await api.get('/hostels?my_hostels=true');
          if (res.data?.success) setHostels(res.data.data || []);
        } catch { /* non-fatal */ }

        try {
          const pushToken = await notificationService.registerForPushNotificationsAsync();
          if (pushToken) await notificationService.sendTokenToBackend(pushToken);
        } catch (e) {
          if (__DEV__) console.error('Notification setup failed:', e);
        }

        return { error: null, user: finalUser };
      }

      const errorMessage = body?.error || body?.message || 'Registration failed.';
      return { error: errorMessage };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Cannot reach server. Check your connection and try again.';
      return { error: errorMessage };
    }
  };

  // ── Tenant Auth Methods ────────────────────────────────────────────────────
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
        hostel_id: connectedHostel.hostel_id,
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
        hostel_id: connectedHostel.hostel_id,
      });
      const body = response.data;

      if (body?.isNewUser) {
        return { error: null, isNewUser: true, data: body.data };
      }

      const token = body?.data?.token;
      const userData = body?.data?.tenant;

      if (token && userData) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        await AsyncStorage.setItem('token', token);

        let finalUser: User = { ...userData, role: 'TENANT' };
        try {
          const res = await api.get('/auth/tenant/me');
          if (res.data?.data) {
            finalUser = { ...finalUser, ...res.data.data, role: 'TENANT' };
          }
        } catch (e) {
          if (__DEV__) console.warn('Failed to fetch full tenant profile in verifyOtp:', e);
        }

        setUser(finalUser);
        await AsyncStorage.setItem('user', JSON.stringify(finalUser));

        try {
          const pushToken = await notificationService.registerForPushNotificationsAsync();
          if (pushToken) await notificationService.sendTokenToBackend(pushToken);
        } catch {}

        return { error: null, user: finalUser };
      }
      return { error: body?.error || body?.message || 'Verification failed' };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Network error';
      return { error: errorMessage };
    }
  };

  // Establishes a session for a brand-new tenant right after tenantRegister
  // succeeds. Deliberately mirrors verifyOtp's success block (setUser directly,
  // not a merge-into-prev) — updateTokenAndUser's merge is a no-op when there
  // was no prior logged-in user, which previously left `user` stuck at null
  // with no forward navigation and no visible error after "Create Account".
  const completeTenantRegistration = async (token: string, tenantData: Partial<User>) => {
    const finalUser: User = { ...tenantData, role: 'TENANT' } as User;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(finalUser);
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(finalUser));

    try {
      const pushToken = await notificationService.registerForPushNotificationsAsync();
      if (pushToken) await notificationService.sendTokenToBackend(pushToken);
    } catch (e) {
      if (__DEV__) console.error('Notification setup failed:', e);
    }
  };

  const disconnectHostel = async () => {
    try {
      await signOut();
      setConnectedHostel(null);
      await AsyncStorage.removeItem('connected_hostel');
    } catch (error) {
      console.error('Failed to disconnect hostel', error);
    }
  };

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/tenant/me');
      const fresh = response.data?.data;
      if (!fresh) return;
      setUser(prev => {
        const merged = { ...(prev || {}), ...fresh, role: 'TENANT' } as User;
        AsyncStorage.setItem('user', JSON.stringify(merged)).catch(() => {});
        return merged;
      });
    } catch (error) {
      if (__DEV__) console.error('Failed to refresh user', error);
    }
  }, []);

  const signOut = async () => {
    setLogoutLoading(true);
    try {
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
      setHostels([]);
      await AsyncStorage.multiRemove(['token', 'user']);
    } catch (e) {
      console.error('Error signing out', e);
    } finally {
      setLogoutLoading(false);
    }
  };

  const updateTokenAndUser = async (token: string | null | undefined, updatedFields: Partial<User>) => {
    try {
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        await AsyncStorage.setItem('token', token);
      }
      setUser(prev => {
        if (!prev) return prev;
        const newUser = { ...prev, ...updatedFields } as User;
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
        const res = await api.get('/hostels?my_hostels=true');
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

    const currentIndex = activeHostels.findIndex(h => Number(h.hostel_id) === Number(user?.hostel_id));
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
    connectedHostel,
    loading,
    logoutLoading,
    hostels,
    hostelsLoading,
    signIn,
    signUp,
    loadHostels,
    cycleHostels,
    connectHostel,
    signInOtp,
    verifyOtp,
    completeTenantRegistration,
    disconnectHostel,
    refreshUser,
    signOut,
    updateTokenAndUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

