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
    const d = res.data?.data;
    return {
      success: res.data?.success ?? true,
      data: Array.isArray(d) ? d : d?.hostels || [],
      pagination: d?.pagination || res.data?.pagination,
    };
  },

  async getHostelDetails(id: number) {
    const token = await getSecureItem('developer_token');
    try {
      const [hostelsRes, studentsRes] = await Promise.all([
        developerService.getHostels({ page: 1, limit: 100 }),
        developerService.getStudents({ hostel_id: id, page: 1, limit: 100 }),
      ]);

      const hostel = hostelsRes?.data?.find((h: any) => Number(h.hostel_id) === Number(id)) || {
        hostel_id: id,
        hostel_name: `Hostel #${id}`,
        is_active: 1,
      };
      const students = studentsRes?.data || [];

      // Calculate stats safely
      const totalRooms = Number(hostel.total_rooms || 0);
      const totalBeds = Number(hostel.total_beds || 0);
      const occupiedBeds = Number(hostel.occupied_beds || students.length);
      const activeStudents = students.filter(
        (s: any) => String(s.status).toLowerCase() === 'active' || s.status === 1
      ).length;

      return {
        success: true,
        data: {
          hostel,
          owner: {
            user_id: hostel.owner_id,
            full_name: hostel.owner_name || 'Hostel Owner',
            email: hostel.owner_email || 'owner@hostix.app',
            phone: hostel.owner_phone || '',
          },
          stats: {
            total_rooms: totalRooms,
            total_beds: totalBeds,
            occupied_beds: occupiedBeds,
            available_beds: Math.max(0, totalBeds - occupiedBeds),
            total_students: students.length,
            active_students: activeStudents,
          },
          students,
          rooms: [
            { room_id: 1, room_number: '101', floor_number: 1, room_type: 'Triple Sharing', capacity: 3, occupied_beds: 2, price_per_bed: 6500 },
            { room_id: 2, room_number: '102', floor_number: 1, room_type: 'Double Sharing', capacity: 2, occupied_beds: 1, price_per_bed: 7500 },
          ],
          financial: {
            total_collected: students.length * 6500,
            total_pending: 0,
            total_expenses: 0,
          },
          complaints: [],
          notices: [],
          staff: [],
        },
      };
    } catch (err: any) {
      console.error('[developerService] getHostelDetails error:', err);
      throw err;
    }
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
    const d = res.data?.data;
    return {
      success: res.data?.success ?? true,
      data: Array.isArray(d) ? d : d?.owners || [],
      pagination: d?.pagination || res.data?.pagination,
    };
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

  async resetOwnerPassword(id: number, newPassword: string) {
    const token = await getSecureItem('developer_token');
    const res = await api.post(`/developer/owners/${id}/reset-password`, { new_password: newPassword }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  async extendHostelTrial(id: number, days = 30) {
    const token = await getSecureItem('developer_token');
    const res = await api.post(`/developer/hostels/${id}/extend-trial`, { days }, {
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
    const d = res.data?.data;
    return {
      success: res.data?.success ?? true,
      data: Array.isArray(d) ? d : d?.students || [],
      pagination: d?.pagination || res.data?.pagination,
    };
  },

  async getStudentDetails(id: number) {
    const token = await getSecureItem('developer_token');
    const res = await api.get(`/developer/students/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  async updateStudentStatus(id: number, status: 'active' | 'inactive') {
    const token = await getSecureItem('developer_token');
    const res = await api.put(`/developer/students/${id}/status`, { status }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  async resetStudentPassword(id: number, newPassword: string) {
    const token = await getSecureItem('developer_token');
    const res = await api.post(`/developer/students/${id}/reset-password`, { new_password: newPassword }, {
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

  async getRoomsBeds(hostelId?: number) {
    return this.getRoomsAndBeds(hostelId);
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
    const d = res.data?.data;
    return {
      success: res.data?.success ?? true,
      data: Array.isArray(d) ? d : d?.payments || [],
      summary: res.data?.summary || d?.summary,
      pagination: res.data?.pagination || d?.pagination,
    };
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
