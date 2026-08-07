import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authService, User } from '../services/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** The currently-active hostel for owners who manage multiple hostels.
   *  Stored in localStorage so it persists across all pages. */
  selectedHostelId: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  initializeAuth: () => Promise<void>;
  /** Update the active hostel. Pass null to clear (falls back to JWT primary). */
  setSelectedHostelId: (hostelId: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      selectedHostelId: null,

      login: async (identifier: string, password: string) => {
        try {
          const response = await authService.login({ identifier, password });
          set({
            user: response.data.user,
            isAuthenticated: true,
            isLoading: false,
            // Reset hostel selection on new login
            selectedHostelId: null,
          });
        } catch (error) {
          set({ user: null, isAuthenticated: false });
          throw error;
        }
      },

      logout: async () => {
        await authService.logout();
        set({ user: null, isAuthenticated: false, selectedHostelId: null });
      },

      setUser: (user: User | null) => {
        set({
          user,
          isAuthenticated: !!user,
        });
      },

      setSelectedHostelId: (hostelId: string | null) => {
        set({ selectedHostelId: hostelId });
      },

      initializeAuth: async () => {
        // Use sessionStorage for tab-independent sessions
        const token = sessionStorage.getItem('authToken');
        const storedUser = authService.getStoredUser();

        if (!token || !storedUser) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return;
        }

        // Verify token matches stored user by fetching current user from backend
        try {
          const currentUser = await authService.getCurrentUser();

          // Check if stored user matches current user from token
          if (currentUser.user_id === storedUser.user_id && currentUser.role_id === storedUser.role_id) {
            set({
              user: currentUser,
              isAuthenticated: true,
              isLoading: false,
            });
            // Update stored user to ensure it's in sync
            sessionStorage.setItem('user', JSON.stringify(currentUser));
          } else {
            // Mismatch - clear and logout
            await authService.logout();
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              selectedHostelId: null,
            });
          }
        } catch (error) {
          // Token invalid or expired
          await authService.logout();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            selectedHostelId: null,
          });
        }
      },
    }),
    {
      name: 'hostel-auth-storage',
      // Use sessionStorage for auth session, but localStorage for hostel selection (cross-page)
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Separate localStorage-based store for active hostel selection (persists across all pages)
const HOSTEL_STORAGE_KEY = 'dhostel_selected_hostel_id';

export const getStoredHostelId = (): string | null => {
  try { return localStorage.getItem(HOSTEL_STORAGE_KEY); } catch { return null; }
};

export const setStoredHostelId = (hostelId: string | null): void => {
  try {
    if (hostelId) localStorage.setItem(HOSTEL_STORAGE_KEY, hostelId);
    else localStorage.removeItem(HOSTEL_STORAGE_KEY);
  } catch { /* noop */ }
};

// No cross-tab sync listener - each tab maintains its own independent session

