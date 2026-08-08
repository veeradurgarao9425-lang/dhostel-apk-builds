/**
 * assistantApi.ts
 * All data-fetching for the Owner Assistant.
 * Reuses the existing api.ts Axios instance — no duplicate setup.
 * Backend already filters by hostel_id from the JWT token.
 */

import api from '../../services/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const safeGet = async (endpoint: string, params?: Record<string, any>) => {
  try {
    const res = await api.get(endpoint, params ? { params } : undefined);
    return res.data?.success ? res.data : null;
  } catch {
    return null;
  }
};

const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ─── Types ───────────────────────────────────────────────────────────────────
export interface DashboardSnapshot {
  studentCount: number;
  activeTenants: number;
  pendingDues: number;
  overdueCount: number;
  availableBeds: number;
  totalBeds: number;
  occupiedBeds: number;
  occupancyRate: number;
  monthCollection: number;
  todayCollection: number;
}

export interface DueSummary {
  totalPending: number;
  pendingStudents: number;
  overdueAmount: number;
  overdueCount: number;
  paidCount: number;
  tenantsCount: number;
  topDefaulters: DueRecord[];
}

export interface DueRecord {
  id: string | number;
  name: string;
  roomNumber?: string;
  amount: number;
  dueDate?: string;
  status: 'overdue' | 'pending' | 'paid';
  studentId?: number;
}

export interface FinancialOverview {
  income: number;
  expenses: number;
  net: number;
  pendingDues: number;
  collectionRate: number;
  trend: TrendPoint[];
}

export interface TrendPoint {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface OccupancyData {
  occupied: number;
  available: number;
  total: number;
  rate: number;
  totalRooms: number;
}

export interface StudentRecord {
  id: number;
  name: string;
  roomNumber?: string;
  bedNumber?: string;
  phone?: string;
  rent?: number;
  status: number;
}

export interface ExpenseSummary {
  totalThisMonth: number;
  count: number;
  breakdown: { category: string; amount: number }[];
}

// ─── Dashboard Snapshot ───────────────────────────────────────────────────────
export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot | null> {
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const startDate = toLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const endDate = toLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const [statsData, summaryData, overviewData] = await Promise.all([
    safeGet('/reports/dashboard-stats'),
    safeGet('/monthly-fees/summary'),
    safeGet('/reports/monthly-overview', { month: monthStr }),
  ]);

  const stats = statsData?.data || {};
  const overview = overviewData?.data?.currentMonth || {};

  let pendingDues = 0;
  let overdueCount = 0;
  let paidCount = 0;
  let tenantsCount = 0;

  if (summaryData?.data?.fees) {
    const fees: any[] = summaryData.data.fees;
    tenantsCount = fees.length;
    const nowMs = Date.now();

    fees.forEach((f) => {
      const balance = parseFloat(f.balance || 0);
      if (balance > 0) {
        pendingDues += balance;
        const due = f.due_date ? new Date(f.due_date).getTime() : nowMs;
        if (due < nowMs) overdueCount++;
      } else {
        paidCount++;
      }
    });
  }

  const monthCollection =
    Number(overview.rentCollected ?? overview.feeCollection ?? stats.monthlyRentCollected ?? 0);
  const todayCollection = Number(stats.todayCollection ?? 0);

  return {
    studentCount: Number(stats.activeTenants ?? stats.totalStudents ?? 0),
    activeTenants: Number(stats.activeTenants ?? 0),
    pendingDues,
    overdueCount,
    availableBeds: Number(stats.availableBeds ?? 0),
    totalBeds: Number(stats.totalBeds ?? 0),
    occupiedBeds: Number(stats.occupiedBeds ?? 0),
    occupancyRate: Number(stats.occupancyRate ?? 0),
    monthCollection,
    todayCollection,
  };
}

// ─── Dues Summary ─────────────────────────────────────────────────────────────
export async function fetchDuesSummary(): Promise<DueSummary | null> {
  const data = await safeGet('/monthly-fees/summary');
  if (!data?.data?.fees) return null;

  const fees: any[] = data.data.fees;
  const nowMs = Date.now();

  let totalPending = 0;
  let pendingStudents = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  let paidCount = 0;

  const pendingFees: any[] = [];

  fees.forEach((f) => {
    const balance = parseFloat(f.balance || 0);
    if (balance > 0) {
      totalPending += balance;
      pendingStudents++;
      pendingFees.push(f);

      const due = f.due_date ? new Date(f.due_date).getTime() : nowMs;
      if (due < nowMs) {
        overdueCount++;
        overdueAmount += balance;
      }
    } else {
      paidCount++;
    }
  });

  const topDefaulters: DueRecord[] = pendingFees
    .sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance))
    .slice(0, 8)
    .map((f) => {
      const due = f.due_date ? new Date(f.due_date).getTime() : nowMs;
      return {
        id: f.student_id || f.fee_id,
        name: `${f.first_name || ''} ${f.last_name || ''}`.trim() || 'Unknown',
        roomNumber: f.room_number ?? undefined,
        amount: parseFloat(f.balance || 0),
        dueDate: f.due_date,
        status: due < nowMs ? 'overdue' : 'pending',
        studentId: f.student_id,
      };
    });

  return {
    totalPending,
    pendingStudents,
    overdueAmount,
    overdueCount,
    paidCount,
    tenantsCount: fees.length,
    topDefaulters,
  };
}

// ─── Financial Overview ───────────────────────────────────────────────────────
export async function fetchFinancialOverview(): Promise<FinancialOverview | null> {
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [overviewData, statsData, summaryData] = await Promise.all([
    safeGet('/reports/monthly-overview', { month: monthStr }),
    safeGet('/reports/dashboard-stats'),
    safeGet('/monthly-fees/summary'),
  ]);

  const cm = overviewData?.data?.currentMonth || {};
  const stats = statsData?.data || {};
  const rawTrend: any[] = overviewData?.data?.trend || [];

  const income = Number(cm.rentCollected ?? cm.feeCollection ?? cm.totalIncome ?? stats.monthlyRentCollected ?? 0);
  const expenses = Number(cm.totalExpenses ?? stats.monthlyExpenses ?? 0);
  const net = Number(cm.netProfit ?? (income - expenses));

  let pendingDues = 0;
  let tenantsCount = 0;
  let paidCount = 0;

  if (summaryData?.data?.fees) {
    const fees: any[] = summaryData.data.fees;
    tenantsCount = fees.length;
    fees.forEach((f) => {
      const b = parseFloat(f.balance || 0);
      if (b > 0) pendingDues += b;
      else paidCount++;
    });
  }

  const totalExpected = income + pendingDues;
  const collectionRate = totalExpected > 0 ? Math.round((income / totalExpected) * 100) : 0;

  const trend: TrendPoint[] = rawTrend.slice(-6).map((t: any) => ({
    month: t.month || '',
    income: Number(t.rentCollected ?? t.totalIncome ?? 0),
    expenses: Number(t.totalExpenses ?? 0),
    net: Number(t.netProfit ?? 0),
  }));

  return { income, expenses, net, pendingDues, collectionRate, trend };
}

// ─── Occupancy ────────────────────────────────────────────────────────────────
export async function fetchOccupancy(): Promise<OccupancyData | null> {
  const data = await safeGet('/reports/dashboard-stats');
  if (!data?.data) return null;

  const d = data.data;
  return {
    occupied: Number(d.occupiedBeds ?? 0),
    available: Number(d.availableBeds ?? 0),
    total: Number(d.totalBeds ?? 0),
    rate: Number(d.occupancyRate ?? 0),
    totalRooms: Number(d.totalRooms ?? 0),
  };
}

// ─── Students ─────────────────────────────────────────────────────────────────
export async function fetchStudents(limit = 20): Promise<StudentRecord[]> {
  const data = await safeGet('/students', { limit, status: 1 });
  if (!data?.data) return [];

  return (Array.isArray(data.data) ? data.data : []).slice(0, limit).map((s: any) => ({
    id: s.student_id ?? s.id,
    name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown',
    roomNumber: s.room_number ?? undefined,
    bedNumber: s.bed_number ?? undefined,
    phone: s.phone ?? undefined,
    rent: Number(s.monthly_rent ?? 0),
    status: Number(s.status ?? 1),
  }));
}

// ─── Expense Summary ──────────────────────────────────────────────────────────
export async function fetchExpenseSummary(): Promise<ExpenseSummary | null> {
  const now = new Date();
  const startDate = toLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const endDate = toLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const data = await safeGet('/expenses', { startDate, endDate, page: 1, limit: 50 });
  if (!data?.data) return null;

  const items: any[] = Array.isArray(data.data) ? data.data : [];
  let totalThisMonth = 0;
  const catMap: Record<string, number> = {};

  items.forEach((e) => {
    const amt = Number(e.amount ?? 0);
    totalThisMonth += amt;
    const cat = e.category || e.expense_category || 'Other';
    catMap[cat] = (catMap[cat] || 0) + amt;
  });

  const breakdown = Object.entries(catMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([category, amount]) => ({ category, amount }));

  return { totalThisMonth, count: items.length, breakdown };
}
