import { useState, useEffect, useCallback } from 'react';
import { getStoredHostelId, setStoredHostelId } from '../store/authStore';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

export interface OwnerHostel {
  hostel_id: number;
  hostel_name: string;
  hostel_code?: string;
}

/**
 * A shared hook that manages the currently selected hostel for owner pages.
 *
 * - Returns the list of owner hostels and the active hostelId.
 * - When activeHostelId changes, pages that use this hook should refetch their data.
 * - Listens for the 'hostelChanged' custom window event so switching on the Dashboard
 *   immediately updates any other open page.
 */
export const useOwnerHostel = () => {
  const user = useAuthStore((state) => state.user);
  const [hostels, setHostels] = useState<OwnerHostel[]>([]);
  const [activeHostelId, setActiveHostelId] = useState<string>(
    getStoredHostelId() || user?.hostel_id?.toString() || ''
  );

  // Fetch the owner's hostels on mount
  useEffect(() => {
    if (user?.role_id !== 2) return;
    api.get('/hostels')
      .then((res) => {
        const data: OwnerHostel[] = res.data.data || [];
        setHostels(data);
        // If no hostel is saved yet, default to the first one
        if (!getStoredHostelId() && data.length > 0) {
          const firstId = data[0].hostel_id.toString();
          setActiveHostelId(firstId);
          setStoredHostelId(firstId);
        }
      })
      .catch((e) => console.error('useOwnerHostel: failed to load hostels', e));
  }, [user?.role_id]);

  // Listen for hostelChanged events from other pages/components (e.g. Dashboard)
  useEffect(() => {
    const handleHostelChange = (e: Event) => {
      const hostelId = (e as CustomEvent<{ hostelId: string }>).detail.hostelId;
      if (hostelId && hostelId !== activeHostelId) {
        setActiveHostelId(hostelId);
      }
    };
    window.addEventListener('hostelChanged', handleHostelChange);
    return () => window.removeEventListener('hostelChanged', handleHostelChange);
  }, [activeHostelId]);

  /** Call this when the user picks a hostel from a dropdown */
  const switchHostel = useCallback(async (hostelId: string) => {
    setActiveHostelId(hostelId);
    setStoredHostelId(hostelId);
    try {
      const res = await api.put('/auth/active-hostel', { hostel_id: Number(hostelId) });
      if (res.data?.success && res.data?.data?.token) {
        sessionStorage.setItem('authToken', res.data.data.token);
      }
    } catch (err) {
      console.error('Failed to switch active hostel on backend:', err);
    }
    window.dispatchEvent(new CustomEvent('hostelChanged', { detail: { hostelId } }));
  }, []);

  return { hostels, activeHostelId, switchHostel };
};
