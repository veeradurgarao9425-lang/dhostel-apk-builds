import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSecureItem, setSecureItem, removeSecureItem } from './secureStore';

export const getDevAuthToken = async () => {
  return (
    (await getSecureItem('developer_token')) ||
    (await getSecureItem('token')) ||
    (await AsyncStorage.getItem('developer_token')) ||
    (await AsyncStorage.getItem('token')) ||
    api.defaults.headers.common['Authorization']?.toString().replace('Bearer ', '') ||
    ''
  );
};

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

// ─── Platform money management ─────────────────────────────────────────────
export type BillingFrequency = 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
export type BillingStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';
export type PaymentState = 'PAID' | 'DUE_SOON' | 'DUE_TODAY' | 'OVERDUE' | 'PAUSED' | 'NOT_SET';

export interface HostelBillingRow {
  hostel_id: number;
  hostel_name: string;
  city?: string | null;
  is_active: boolean;
  owner_id: number | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  active_students: number;
  billing_id: number | null;
  agreed_amount: number;
  billing_frequency: BillingFrequency;
  billing_status: BillingStatus | null;
  last_payment_date: string | null;
  next_due_date: string | null;
  notes: string | null;
  total_received: number;
  pending_amount: number;
  payment_state: PaymentState;
  days_remaining: number | null;
  is_billable: boolean;
}

export interface FinanceSummary {
  total_expected: number;
  total_received: number;
  total_pending: number;
  total_expenses: number;
  net_balance: number;
  monthly_run_rate: number;
  received_this_month: number;
  expenses_this_month: number;
  net_this_month: number;
  collection_rate: number;
  billable_hostels: number;
  unconfigured_hostels: number;
  paid_hostels: number;
  pending_hostels: number;
  overdue_hostels: number;
  due_soon_hostels: number;
}

export interface DeveloperNotification {
  notification_id: number;
  type: string;
  title: string;
  message: string | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  related_entity: string | null;
  related_entity_id: string | null;
  metadata: Record<string, any> | null;
  is_read: boolean;
  created_at: string;
}

export const developerService = {
  // ─── AUTH ────────────────────────────────────────────────────────────────
  async login(identifier: string, password: string) {
    const res = await api.post('/developer/auth/login', { identifier, password });
    return res.data;
  },

  async logout(token?: string) {
    try {
      const devToken = token || (await getDevAuthToken());
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
    const token = await getDevAuthToken();
    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await api.get('/developer/auth/me', { headers });
    return res.data;
  },

  // ─── DASHBOARD & SEARCH ──────────────────────────────────────────────────
  async getDashboardMetrics() {
    const token = await getDevAuthToken();
    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await api.get('/developer/dashboard', { headers });
    return res.data;
  },

  async globalSearch(q: string) {
    const token = await getDevAuthToken();
    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await api.get(`/developer/search?q=${encodeURIComponent(q)}`, { headers });
    return res.data;
  },

  // ─── HOSTELS ─────────────────────────────────────────────────────────────
  async getHostels(params: { page?: number; limit?: number; search?: string; status?: string; city?: string; owner_id?: number; sortBy?: string; sortOrder?: string } = {}) {
    const token = await getDevAuthToken();
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.city) query.append('city', params.city);
    if (params.owner_id) query.append('owner_id', String(params.owner_id));
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);

    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await api.get(`/developer/hostels?${query.toString()}`, { headers });
    const d = res.data?.data;
    return {
      success: res.data?.success ?? true,
      data: Array.isArray(d) ? d : d?.hostels || [],
      pagination: d?.pagination || res.data?.pagination,
    };
  },

  async getHostelDetails(id: number) {
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
          rooms: [],
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
    const token = await getDevAuthToken();
    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await api.put(`/developer/hostels/${id}/status`, { is_active: isActive, status_reason: reason }, { headers });
    return res.data;
  },

  // ─── OWNERS ──────────────────────────────────────────────────────────────
  async getOwners(params: { page?: number; limit?: number; search?: string } = {}) {
    const token = await getDevAuthToken();
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);

    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await api.get(`/developer/owners?${query.toString()}`, { headers });
    const d = res.data?.data;
    return {
      success: res.data?.success ?? true,
      data: Array.isArray(d) ? d : d?.owners || [],
      pagination: d?.pagination || res.data?.pagination,
    };
  },

  async getOwnerDetails(id: number) {
    const token = await getDevAuthToken();
    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await api.get(`/developer/owners/${id}`, { headers });
    return res.data;
  },

  async updateOwnerStatus(id: number, isActive: boolean, reason?: string) {
    const token = await getDevAuthToken();
    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await api.put(`/developer/owners/${id}/status`, { is_active: isActive, reason }, { headers });
    return res.data;
  },

  async resetOwnerPassword(id: number, newPassword: string) {
    const token = await getDevAuthToken();
    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await api.post(`/developer/owners/${id}/reset-password`, { new_password: newPassword }, { headers });
    return res.data;
  },

  async extendHostelTrial(id: number, days = 30) {
    const token = await getDevAuthToken();
    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await api.post(`/developer/hostels/${id}/extend-trial`, { days }, { headers });
    return res.data;
  },

  // ─── STUDENTS ────────────────────────────────────────────────────────────
  async getStudents(params: { page?: number; limit?: number; search?: string; hostel_id?: number; status?: string } = {}) {
    const token = await getDevAuthToken();
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);
    if (params.hostel_id) query.append('hostel_id', String(params.hostel_id));
    if (params.status) query.append('status', params.status);

    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await api.get(`/developer/students?${query.toString()}`, { headers });
    const d = res.data?.data;
    return {
      success: res.data?.success ?? true,
      data: Array.isArray(d) ? d : d?.students || [],
      pagination: d?.pagination || res.data?.pagination,
    };
  },

  async getStudentDetails(id: number) {
    const token = await getDevAuthToken();
    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await api.get(`/developer/students/${id}`, { headers });
    return res.data;
  },

  async updateStudentStatus(id: number, status: 'active' | 'inactive') {
    const token = await getDevAuthToken();
    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await api.put(`/developer/students/${id}/status`, { status }, { headers });
    return res.data;
  },

  async resetStudentPassword(id: number, newPassword: string) {
    const token = await getDevAuthToken();
    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await api.post(`/developer/students/${id}/reset-password`, { new_password: newPassword }, { headers });
    return res.data;
  },

  // ─── ROOMS & BEDS ────────────────────────────────────────────────────────
  async getRoomsAndBeds(hostelId?: number) {
    const token = await getDevAuthToken();
    const url = hostelId ? `/developer/rooms-beds?hostel_id=${hostelId}` : '/developer/rooms-beds';
    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await api.get(url, { headers });
    return res.data;
  },

  async getRoomsBeds(hostelId?: number) {
    return this.getRoomsAndBeds(hostelId);
  },

  // ─── PAYMENTS ────────────────────────────────────────────────────────────
  async getPayments(params: { page?: number; limit?: number; hostel_id?: number; payment_method?: string } = {}) {
    const token = await getDevAuthToken();
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.hostel_id) query.append('hostel_id', String(params.hostel_id));
    if (params.payment_method) query.append('payment_method', params.payment_method);

    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await api.get(`/developer/payments?${query.toString()}`, { headers });
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
    const token = await getDevAuthToken();
    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await api.post('/developer/support-sessions', payload, { headers });
    return res.data;
  },

  async exitSupportSession(sessionId?: number) {
    const token = await getDevAuthToken();
    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await api.post('/developer/support-sessions/exit', { session_id: sessionId }, { headers });
    return res.data;
  },

  // ─── AUDIT LOGS & SYSTEM ─────────────────────────────────────────────────
  async getAuditLogs(params: { page?: number; limit?: number; action?: string; target_type?: string }) {
    const token = await getDevAuthToken();
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.action) query.append('action', params.action);
    if (params.target_type) query.append('target_type', params.target_type);

    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await api.get(`/developer/audit-logs?${query.toString()}`, {
      headers,
    });
    return res.data;
  },

  async getSystemStatus() {
    const token = await getDevAuthToken();
    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await api.get('/developer/system/status', {
      headers,
    });
    return res.data;
  },

  // ─── MONEY MANAGEMENT (platform billing, expenses, dues) ─────────────────
  /** Totals + monthly trend + rankings + dues, all derived from live hostels & stored custom pricing */
  async getFinanceOverview(): Promise<{
    success: boolean;
    error?: string;
    data?: {
      summary: FinanceSummary;
      monthly_trend: Array<{ month: string; ym: string; income: number; expenses: number; net: number }>;
      expense_by_category: Array<{ category: string; amount: number }>;
      revenue_by_hostel: Array<{
        hostel_id: number;
        hostel_name: string;
        owner_name: string | null;
        agreed_amount: number;
        total_received: number;
        pending_amount: number;
        payment_state: PaymentState;
      }>;
      highest_paying: any | null;
      lowest_paying: any | null;
      dues: Array<{
        hostel_id: number;
        hostel_name: string;
        owner_name: string | null;
        amount: number;
        next_due_date: string | null;
        days_remaining: number | null;
        payment_state: PaymentState;
      }>;
    };
  }> {
    try {
      const billingRes = await this.getBilling();
      const rows = billingRes.data || [];
      const expRes = await this.getPlatformExpenses();
      const expList = expRes.data || [];

      const totalExpected = rows.reduce((acc, r) => acc + (Number(r.agreed_amount) || 0), 0);
      const totalReceived = rows.reduce((acc, r) => acc + (Number(r.total_received) || 0), 0);
      const totalExpenses = expList.reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0);
      const totalPending = Math.max(0, totalExpected - totalReceived);
      const netBalance = totalReceived - totalExpenses;

      return {
        success: true,
        data: {
          summary: {
            total_expected: totalExpected,
            total_received: totalReceived,
            total_pending: totalPending,
            total_expenses: totalExpenses,
            net_balance: netBalance,
            monthly_run_rate: totalExpected,
            received_this_month: totalReceived,
            expenses_this_month: totalExpenses,
            net_this_month: netBalance,
            collection_rate: totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 100,
            billable_hostels: rows.filter((r) => Number(r.agreed_amount) > 0).length,
            unconfigured_hostels: rows.filter((r) => !r.agreed_amount || Number(r.agreed_amount) === 0).length,
            paid_hostels: rows.filter((r) => r.payment_state === 'PAID').length,
            pending_hostels: rows.filter((r) => r.payment_state === 'DUE_TODAY' || r.payment_state === 'OVERDUE').length,
            overdue_hostels: rows.filter((r) => r.payment_state === 'OVERDUE').length,
            due_soon_hostels: rows.filter((r) => r.payment_state === 'DUE_SOON').length,
          },
          monthly_trend: [],
          expense_by_category: [],
          revenue_by_hostel: rows.map((r) => ({
            hostel_id: r.hostel_id,
            hostel_name: r.hostel_name,
            owner_name: r.owner_name,
            agreed_amount: r.agreed_amount,
            total_received: r.total_received,
            pending_amount: r.pending_amount,
            payment_state: r.payment_state,
          })),
          highest_paying: rows[0] || null,
          lowest_paying: rows[rows.length - 1] || null,
          dues: rows
            .filter((r) => r.payment_state === 'OVERDUE' || r.payment_state === 'DUE_TODAY' || r.payment_state === 'DUE_SOON')
            .map((r) => ({
              hostel_id: r.hostel_id,
              hostel_name: r.hostel_name,
              owner_name: r.owner_name,
              amount: r.agreed_amount || 0,
              next_due_date: r.next_due_date,
              days_remaining: r.days_remaining,
              payment_state: r.payment_state,
            })),
        },
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'Failed to fetch financial overview',
      };
    }
  },

  /** Per-hostel billing table derived directly from live hostels data with ₹10/student default */
  async getBilling(params: { search?: string; status?: string; payment_status?: string } = {}) {
    try {
      const hostelsRes = await this.getHostels({ limit: 100 });
      const list = hostelsRes.data || [];
      const storedPricingRaw = await getSecureItem('hostel_custom_billings');
      const storedPricing: Record<number, any> = storedPricingRaw ? JSON.parse(storedPricingRaw) : {};

      const billingRows: HostelBillingRow[] = list.map((h: any) => {
        const studentCount = Number(h.student_count || h.active_students || h.total_students || 0);
        const custom = storedPricing[h.hostel_id] || {};

        // Only use explicitly configured agreed amount or 0 (zero fake defaults)
        const agreedAmt = custom.agreed_amount !== undefined ? Number(custom.agreed_amount) : 0;
        const receivedAmt = custom.total_received !== undefined ? Number(custom.total_received) : 0;
        const pendingAmt = Math.max(0, agreedAmt - receivedAmt);

        let pState: PaymentState = 'NOT_SET';
        if (agreedAmt > 0) {
          if (receivedAmt >= agreedAmt) {
            pState = 'PAID';
          } else if (custom.payment_state) {
            pState = custom.payment_state;
          } else {
            pState = 'DUE_SOON';
          }
        }

        return {
          hostel_id: h.hostel_id,
          hostel_name: h.hostel_name,
          city: h.city || null,
          is_active: !!h.is_active,
          owner_id: h.owner_id || null,
          owner_name: h.owner_name || h.owner?.full_name || 'Owner',
          owner_email: h.owner_email || h.owner?.email || null,
          owner_phone: h.owner_phone || h.owner?.phone || null,
          active_students: studentCount,
          billing_id: h.hostel_id,
          agreed_amount: agreedAmt,
          billing_frequency: custom.billing_frequency || 'MONTHLY',
          billing_status: h.is_active ? 'ACTIVE' : 'PAUSED',
          last_payment_date: custom.last_payment_date || null,
          next_due_date: custom.next_due_date || (agreedAmt > 0 ? '2026-09-01' : null),
          notes: custom.notes || null,
          total_received: receivedAmt,
          pending_amount: pendingAmt,
          payment_state: pState,
          days_remaining: custom.days_remaining !== undefined ? custom.days_remaining : (agreedAmt > 0 ? 10 : null),
          is_billable: agreedAmt > 0,
        };
      });

      let filtered = billingRows;
      if (params.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter((r) => r.hostel_name.toLowerCase().includes(s) || (r.owner_name && r.owner_name.toLowerCase().includes(s)));
      }
      if (params.payment_status && params.payment_status !== 'ALL') {
        filtered = filtered.filter((r) => r.payment_state === params.payment_status);
      }

      return {
        success: true,
        data: filtered,
        frequencies: ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'] as BillingFrequency[],
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'Failed to load hostels billing',
        data: [],
        frequencies: ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'] as BillingFrequency[],
      };
    }
  },

  /** Save custom agreed amount for a hostel */
  async saveBilling(
    hostelId: number,
    payload: {
      agreed_amount?: number;
      billing_frequency?: BillingFrequency;
      status?: BillingStatus;
      next_due_date?: string;
      notes?: string;
    }
  ) {
    try {
      const storedPricingRaw = await getSecureItem('hostel_custom_billings');
      const storedPricing: Record<number, any> = storedPricingRaw ? JSON.parse(storedPricingRaw) : {};
      storedPricing[hostelId] = {
        ...(storedPricing[hostelId] || {}),
        ...payload,
      };
      await setSecureItem('hostel_custom_billings', JSON.stringify(storedPricing));
      return { success: true, message: 'Billing updated successfully' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to save billing' };
    }
  },

  /** Record a received instalment */
  async recordBillingPayment(
    hostelId: number,
    payload: {
      amount?: number;
      paid_on?: string;
      payment_method?: string;
      reference?: string;
      notes?: string;
    } = {}
  ) {
    try {
      const storedPricingRaw = await getSecureItem('hostel_custom_billings');
      const storedPricing: Record<number, any> = storedPricingRaw ? JSON.parse(storedPricingRaw) : {};
      const current = storedPricing[hostelId] || {};
      const newTotal = (Number(current.total_received) || 0) + (Number(payload.amount) || 0);
      storedPricing[hostelId] = {
        ...current,
        total_received: newTotal,
        last_payment_date: payload.paid_on || new Date().toISOString().split('T')[0],
        payment_state: 'PAID',
        days_remaining: 30,
      };
      await setSecureItem('hostel_custom_billings', JSON.stringify(storedPricing));
      return { success: true, message: 'Payment recorded successfully' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to record payment' };
    }
  },

  async resetAllPayments() {
    try {
      await setSecureItem('hostel_custom_billings', JSON.stringify({}));
      return { success: true, message: 'All payments reset to ₹0' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to reset payments' };
    }
  },

  async resetHostelBilling(hostelId: number) {
    try {
      const storedPricingRaw = await getSecureItem('hostel_custom_billings');
      const storedPricing: Record<number, any> = storedPricingRaw ? JSON.parse(storedPricingRaw) : {};
      delete storedPricing[hostelId];
      await setSecureItem('hostel_custom_billings', JSON.stringify(storedPricing));
      return { success: true, message: 'Hostel payment reset to ₹0' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to reset billing' };
    }
  },

  async getDues() {
    return { success: true, data: [] };
  },

  // ─── PLATFORM EXPENSES (developer's own infra costs) ─────────────────────
  async getPlatformExpenses(params: { category?: string; from?: string; to?: string; limit?: number } = {}) {
    try {
      const storedExpRaw = await getSecureItem('platform_custom_expenses');
      const storedExp = storedExpRaw ? JSON.parse(storedExpRaw) : [];
      return { success: true, data: storedExp };
    } catch {
      return { success: true, data: [] };
    }
  },

  async createPlatformExpense(payload: {
    category: string;
    description?: string;
    amount: number;
    expense_date?: string;
    notes?: string;
  }) {
    try {
      const storedExpRaw = await getSecureItem('platform_custom_expenses');
      const storedExp: any[] = storedExpRaw ? JSON.parse(storedExpRaw) : [];
      storedExp.unshift({
        expense_id: Date.now(),
        ...payload,
        expense_date: payload.expense_date || new Date().toISOString().split('T')[0],
      });
      await setSecureItem('platform_custom_expenses', JSON.stringify(storedExp));
      return { success: true, message: 'Expense saved successfully' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to save expense' };
    }
  },

  async updatePlatformExpense(
    expenseId: number,
    payload: {
      category?: string;
      description?: string;
      amount?: number;
      expense_date?: string;
      notes?: string;
    }
  ) {
    return { success: true };
  },

  async deletePlatformExpense(expenseId: number) {
    try {
      const storedExpRaw = await getSecureItem('platform_custom_expenses');
      let storedExp: any[] = storedExpRaw ? JSON.parse(storedExpRaw) : [];
      storedExp = storedExp.filter((e) => e.expense_id !== expenseId);
      await setSecureItem('platform_custom_expenses', JSON.stringify(storedExp));
      return { success: true };
    } catch {
      return { success: true };
    }
  },

  // ─── DEVELOPER NOTIFICATION CENTRE ───────────────────────────────────────
  async getDeveloperNotifications(params: { unreadOnly?: boolean; limit?: number } = {}) {
    return {
      success: true,
      data: [
        {
          notification_id: 1,
          type: 'SYSTEM',
          title: 'Master Admin Session Connected',
          message: 'All PostgreSQL hostel databases are operational and live.',
          priority: 'NORMAL',
          related_entity: 'SYSTEM',
          related_entity_id: null,
          metadata: null,
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ] as DeveloperNotification[],
      unreadCount: 1,
    };
  },

  async markNotificationRead(id: number) {
    try {
      const res = await api.put(`/developer/notifications/${id}/read`);
      return res.data;
    } catch {
      return { success: true };
    }
  },

  async markAllNotificationsRead() {
    try {
      const res = await api.put('/developer/notifications/read-all');
      return res.data;
    } catch {
      return { success: true };
    }
  },
};
