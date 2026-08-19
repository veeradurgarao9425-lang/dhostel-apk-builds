import api from './api';
import { getSecureItem, setSecureItem, removeSecureItem } from './secureStore';

export interface DeveloperUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role_title: string;
  status: string;
  last_login_at?: string;
}

export interface SupportSessionState {
  isSupportMode: boolean;
  sessionId: number;
  originalDeveloperToken: string;
  targetUser: any;
  targetRole: 'OWNER' | 'TENANT';
  hostelName?: string;
  expiresAt: string;
}

export const developerService = {
  // ─── AUTH ────────────────────────────────────────────────────────────────
  async login(identifier: string, password: string) {
    const res = await api.post('/developer/auth/login', { identifier, password });
    return res.data;
  },

  async logout(token?: string) {
    try {
      const devToken = token || (await getSecureItem('developer_token'));
      if (devToken) {
        await api.post('/developer/auth/logout', {}, {
          headers: { Authorization: `Bearer ${devToken}` },
        });
      }
    } catch (e) {
      console.warn('Developer logout request warning:', e);
    }
  },

  async getMe() {
    const token = await getSecureItem('developer_token');
    const res = await api.get('/developer/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  // ─── DASHBOARD & SEARCH ──────────────────────────────────────────────────
  async getDashboardMetrics() {
    const token = await getSecureItem('developer_token');
    const res = await api.get('/developer/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  async globalSearch(q: string) {
    const token = await getSecureItem('developer_token');
    const res = await api.get(`/developer/search?q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  // ─── HOSTELS ─────────────────────────────────────────────────────────────
  async getHostels(params: { page?: number; limit?: number; search?: string; status?: string; city?: string; owner_id?: number; sortBy?: string; sortOrder?: string }) {
    const token = await getSecureItem('developer_token');
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.city) query.append('city', params.city);
    if (params.owner_id) query.append('owner_id', String(params.owner_id));
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);

    const res = await api.get(`/developer/hostels?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  async getHostelDetails(id: number) {
    const token = await getSecureItem('developer_token');
    const res = await api.get(`/developer/hostels/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  async updateHostelStatus(id: number, isActive: boolean, reason?: string) {
    const token = await getSecureItem('developer_token');
    const res = await api.put(`/developer/hostels/${id}/status`, { is_active: isActive, status_reason: reason }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  // ─── OWNERS ──────────────────────────────────────────────────────────────
  async getOwners(params: { page?: number; limit?: number; search?: string }) {
    const token = await getSecureItem('developer_token');
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);

    const res = await api.get(`/developer/owners?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  async getOwnerDetails(id: number) {
    const token = await getSecureItem('developer_token');
    const res = await api.get(`/developer/owners/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  async updateOwnerStatus(id: number, isActive: boolean, reason?: string) {
    const token = await getSecureItem('developer_token');
    const res = await api.put(`/developer/owners/${id}/status`, { is_active: isActive, reason }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  // ─── STUDENTS ────────────────────────────────────────────────────────────
  async getStudents(params: { page?: number; limit?: number; search?: string; hostel_id?: number; status?: string }) {
    const token = await getSecureItem('developer_token');
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);
    if (params.hostel_id) query.append('hostel_id', String(params.hostel_id));
    if (params.status) query.append('status', params.status);

    const res = await api.get(`/developer/students?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  async getStudentDetails(id: number) {
    const token = await getSecureItem('developer_token');
    const res = await api.get(`/developer/students/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  // ─── ROOMS & BEDS ────────────────────────────────────────────────────────
  async getRoomsAndBeds(hostelId?: number) {
    const token = await getSecureItem('developer_token');
    const url = hostelId ? `/developer/rooms-beds?hostel_id=${hostelId}` : '/developer/rooms-beds';
    const res = await api.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  // ─── PAYMENTS ────────────────────────────────────────────────────────────
  async getPayments(params: { page?: number; limit?: number; hostel_id?: number; payment_method?: string }) {
    const token = await getSecureItem('developer_token');
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.hostel_id) query.append('hostel_id', String(params.hostel_id));
    if (params.payment_method) query.append('payment_method', params.payment_method);

    const res = await api.get(`/developer/payments?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  // ─── SUPPORT SESSIONS ────────────────────────────────────────────────────
  async createSupportSession(payload: {
    target_user_id: number;
    target_role: 'OWNER' | 'TENANT';
    hostel_id?: number;
    reason?: string;
    permission_level?: 'VIEW_ONLY' | 'SUPPORT' | 'FULL_SUPPORT';
  }) {
    const token = await getSecureItem('developer_token');
    const res = await api.post('/developer/support-sessions', payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  async exitSupportSession(sessionId?: number) {
    const token = await getSecureItem('developer_token');
    const res = await api.post('/developer/support-sessions/exit', { session_id: sessionId }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  // ─── AUDIT LOGS & SYSTEM ─────────────────────────────────────────────────
  async getAuditLogs(params: { page?: number; limit?: number; action?: string; target_type?: string }) {
    const token = await getSecureItem('developer_token');
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.action) query.append('action', params.action);
    if (params.target_type) query.append('target_type', params.target_type);

    const res = await api.get(`/developer/audit-logs?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  async getSystemStatus() {
    const token = await getSecureItem('developer_token');
    const res = await api.get('/developer/system/status', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },
};
