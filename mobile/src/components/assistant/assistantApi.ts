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
  partialCount: number;
  unpaidCount: number;
  totalPaidAmount: number;
  tenantsCount: number;
  topDefaulters: DueRecord[];
  allDefaulters: DueRecord[];
}

export interface DueRecord {
  id: string | number;
  name: string;
  roomNumber?: string;
  amount: number;
  dueDate?: string;
  status: 'overdue' | 'pending' | 'paid';
  studentId?: number;
  phone?: string;
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
  totalFloors: number;
  singleRooms: number;
  doubleRooms: number;
  tripleRooms: number;
  fourRooms: number;
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
  items: any[];
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
  let paidCount = 0;      // Fully Paid
  let partialCount = 0;   // Partially Paid
  let unpaidCount = 0;    // Fully Unpaid
  let totalPaidAmount = 0;

  const pendingFees: any[] = [];

  fees.forEach((f) => {
    const balance = parseFloat(f.balance || 0);
    const paid = parseFloat(f.paid_amount || f.amount_paid || 0);
    totalPaidAmount += paid;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const dueDateObj = f.due_date ? new Date(f.due_date) : new Date();
    dueDateObj.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((now.getTime() - dueDateObj.getTime()) / 86400000);

    const carryForward = parseFloat(f.carry_forward || 0);
    const effectiveCarryForward = Math.max(0, carryForward - paid);

    const isOverdue = diffDays > 0 || effectiveCarryForward > 0;

    if (balance > 0) {
      totalPending += balance;
      pendingStudents++;
      pendingFees.push(f);

      if (isOverdue) {
        overdueCount++;
        overdueAmount += balance;
      }

      if (paid > 0) {
        partialCount++;
      } else {
        unpaidCount++;
      }
    } else {
      paidCount++;
    }
  });

  const allDefaulters = pendingFees
    .sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance))
    .map((f) => {
      const due = f.due_date ? new Date(f.due_date).getTime() : nowMs;
      return {
        id: f.student_id || f.fee_id,
        name: `${f.first_name || ''} ${f.last_name || ''}`.trim() || 'Unknown',
        roomNumber: f.room_number ?? undefined,
        amount: parseFloat(f.balance || 0),
        dueDate: f.due_date,
        status: (due < nowMs) ? ('overdue' as const) : ('pending' as const),
        studentId: f.student_id,
        phone: f.phone || f.contact_number || f.mobile_number || f.student_phone || undefined,
      };
    });
    
  const topDefaulters: DueRecord[] = allDefaulters.slice(0, 8);

  return {
    totalPending,
    pendingStudents,
    overdueAmount,
    overdueCount,
    paidCount,
    partialCount,
    unpaidCount,
    totalPaidAmount,
    tenantsCount: fees.length,
    topDefaulters,
    allDefaulters,
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
  const [statsRes, roomsRes] = await Promise.all([
    safeGet('/reports/dashboard-stats'),
    safeGet('/rooms', { limit: 200 }),
  ]);

  const d = statsRes?.data || {};
  const rooms: any[] = Array.isArray(roomsRes?.data) ? roomsRes.data : [];

  let calcTotalBeds = 0;
  let calcOccupied = 0;
  let calcAvailable = 0;
  let singleRooms = 0;
  let doubleRooms = 0;
  let tripleRooms = 0;
  let fourRooms = 0;
  const floorSet = new Set<number>();

  rooms.forEach((r) => {
    const cap = Number(r.total_capacity || r.capacity || 0);
    const occ = Number(r.occupied_beds || 0);
    const avail = Number(r.available_beds || (cap - occ));
    calcTotalBeds += cap;
    calcOccupied += occ;
    calcAvailable += Math.max(0, avail);

    if (cap === 1) singleRooms++;
    else if (cap === 2) doubleRooms++;
    else if (cap === 3) tripleRooms++;
    else if (cap >= 4) fourRooms++;

    if (r.floor_number !== undefined && r.floor_number !== null) {
      floorSet.add(Number(r.floor_number));
    }
  });

  const total = calcTotalBeds || Number(d.totalBeds ?? 0);
  const occupied = calcOccupied || Number(d.occupiedBeds ?? 0);
  const available = calcAvailable || Number(d.availableBeds ?? 0);
  const rate = total > 0 ? Math.round((occupied / total) * 100) : Number(d.occupancyRate ?? 0);

  return {
    occupied,
    available,
    total,
    rate,
    totalRooms: rooms.length || Number(d.totalRooms ?? 0),
    totalFloors: floorSet.size || 1,
    singleRooms,
    doubleRooms,
    tripleRooms,
    fourRooms,
  };
}

// ─── Students ─────────────────────────────────────────────────────────────────
export async function fetchStudents(params: any = {}): Promise<StudentRecord[]> {
  // Default to limit 100 to avoid freezing, but allow overriding
  const data = await safeGet('/students', { limit: 100, ...params });
  if (!data?.data) return [];

  return (Array.isArray(data.data) ? data.data : []).map((s: any) => ({
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

  const expenseItems = items.slice(0, 5).map((e: any) => ({
    title: e.description || e.expense_name || e.category || 'Expense',
    amount: Number(e.amount ?? 0),
    category: e.category || 'Other',
    date: e.expense_date || e.created_at || ''
  }));

  return { totalThisMonth, count: items.length, breakdown, items: expenseItems };
}

export async function fetchMyHostels(): Promise<any[]> {
  const data = await safeGet('/hostels', { my_hostels: true });
  return data?.data || [];
}

export async function switchActiveHostel(hostelId: number): Promise<any> {
  try {
    const res = await api.put('/auth/active-hostel', { hostel_id: hostelId });
    return res.data;
  } catch {
    return null;
  }
}

export async function fetchStaffList(): Promise<any[]> {
  const data = await safeGet('/staff');
  return data?.data || [];
}

export async function fetchGuestsList(): Promise<{ guests: any[]; summary: { count: number; totalCollected: number } } | null> {
  const data = await safeGet('/guests');
  if (!data) return null;
  return {
    guests: data.data || [],
    summary: data.summary || { count: 0, totalCollected: 0 }
  };
}

export async function fetchStudentStats(): Promise<any> {
  const data = await safeGet('/students/stats');
  return data?.data || { active: 0, inactive: 0, prebooked: 0, qrRegister: 0, total: 0, unallocated: 0, pendingAdmissions: 0 };
}

// ─── Student Search by Name & Details ─────────────────────────────────────────
export async function fetchStudentDetails(studentId: number | string): Promise<any | null> {
  const data = await safeGet(`/students/${studentId}`);
  return data?.data || null;
}

export async function fetchStudentByName(nameQuery: string): Promise<any[]> {
  const q = nameQuery.toLowerCase().trim();
  const data = await safeGet('/students', { limit: 250, search: q });
  let list: any[] = [];
  
  if (data?.data && Array.isArray(data.data)) {
    list = data.data;
  } else {
    // Fallback: fetch general list and filter locally
    const fallback = await safeGet('/students', { limit: 250 });
    if (fallback?.data && Array.isArray(fallback.data)) {
      list = fallback.data.filter((s: any) => {
        const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
        const phone = (s.phone || '').toLowerCase();
        const room = String(s.room_number || '').toLowerCase();
        return fullName.includes(q) || phone.includes(q) || room.includes(q);
      });
    }
  }

  // Hydrate top matches with full detailed profile (guardian, payments, dues, documents)
  const hydrated = await Promise.all(
    list.slice(0, 5).map(async (s: any) => {
      if (s.student_id) {
        try {
          const detail = await fetchStudentDetails(s.student_id);
          if (detail) return { ...s, ...detail };
        } catch {}
      }
      return s;
    })
  );

  return hydrated.length > 0 ? hydrated : list;
}

export async function fetchNoticesCount(): Promise<number> {
  const res = await safeGet('/notices');
  return res?.data && Array.isArray(res.data) ? res.data.length : 0;
}

// ─── Room Details by Room Number ──────────────────────────────────────────────

export async function fetchRoomByNumber(roomNum: number | string): Promise<any | null> {
  const data = await safeGet('/rooms', { limit: 200 });
  if (!data?.data || !Array.isArray(data.data)) return null;

  const target = String(roomNum).trim().toLowerCase();
  const foundRoom = data.data.find((r: any) => {
    const rn = String(r.room_number || '').trim().toLowerCase();
    const rname = String(r.room_name || '').trim().toLowerCase();
    return rn === target || rname === target || rn.includes(target);
  });
  if (!foundRoom) return null;

  // Fetch full details including occupants and fee summary
  const [roomDetail, duesSummary] = await Promise.all([
    safeGet(`/rooms/${foundRoom.room_id}`),
    safeGet('/monthly-fees/summary')
  ]);

  const result = roomDetail?.data || foundRoom;
  const feesList = duesSummary?.data?.fees || [];
  const feeMap = new Map<number, any>();
  feesList.forEach((f: any) => {
    if (f.student_id) feeMap.set(Number(f.student_id), f);
  });

  if (Array.isArray(result.occupants) && result.occupants.length > 0) {
    result.occupants = result.occupants.map((occ: any) => {
      const sId = Number(occ.student_id || occ.id || occ.studentId);
      const fee = feeMap.get(sId);
      const balance = fee !== undefined ? parseFloat(fee.balance || 0) : (occ.due_amount !== undefined ? parseFloat(occ.due_amount) : 0);
      const isPaid = balance <= 0;
      return {
        ...occ,
        due_amount: balance,
        rent_status: isPaid ? 'paid' : 'pending'
      };
    });
  }

  return result;
}

// ─── Floor Details by Floor Number ───────────────────────────────────────────
export async function fetchRooms(): Promise<any[]> {
  const data = await safeGet('/rooms', { limit: 200 });
  if (!data?.data || !Array.isArray(data.data)) return [];
  return data.data;
}

export async function fetchRoomsByFloor(floorNum: number): Promise<{ floorNumber: number; totalRooms: number; totalBeds: number; occupiedBeds: number; availableBeds: number; rooms: any[] } | null> {
  const data = await safeGet('/rooms', { limit: 200 });
  if (!data?.data || !Array.isArray(data.data)) return null;

  const floorRooms = data.data.filter((r: any) => Number(r.floor_number) === Number(floorNum));
  if (floorRooms.length === 0) return null;

  let totalBeds = 0;
  let occupiedBeds = 0;
  let availableBeds = 0;

  floorRooms.forEach((r: any) => {
    totalBeds += Number(r.total_capacity || r.capacity || 0);
    occupiedBeds += Number(r.occupied_beds || 0);
    availableBeds += Number(r.available_beds || 0);
  });

  return {
    floorNumber: floorNum,
    totalRooms: floorRooms.length,
    totalBeds,
    occupiedBeds,
    availableBeds,
    rooms: floorRooms,
  };
}

// ─── Paid Students List ──────────────────────────────────────────────────────
export async function fetchPaidStudents(): Promise<any[]> {
  const data = await safeGet('/monthly-fees/summary');
  if (!data?.data?.fees || !Array.isArray(data.data.fees)) return [];

  const paid = data.data.fees.filter((f: any) => {
    const balance = parseFloat(f.balance || 0);
    const amountPaid = parseFloat(f.paid_amount || f.amount_paid || 0);
    return balance <= 0 || (amountPaid > 0 && balance === 0);
  });

  return paid.map((f: any) => ({
    name: `${f.first_name || ''} ${f.last_name || ''}`.trim() || 'Student',
    roomNumber: f.room_number || 'N/A',
    paidAmount: parseFloat(f.paid_amount || f.amount_paid || f.monthly_rent || 0),
    paidDate: f.updated_at || f.paid_date || 'This Month',
    phone: f.phone || '',
  }));
}

// ─── Students Joined This Month ───────────────────────────────────────────────
export async function fetchStudentsJoinedThisMonth(): Promise<any[]> {
  const data = await safeGet('/students', { limit: 250, status: 1 });
  if (!data?.data || !Array.isArray(data.data)) return [];

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return data.data.filter((s: any) => {
    const dStr = s.joining_date || s.created_at;
    if (!dStr) return true; // fallback to include active if date missing
    const d = new Date(dStr);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
}

// ─── Students Vacated This Month ──────────────────────────────────────────────
export async function fetchStudentsVacatedThisMonth(): Promise<any[]> {
  const data = await safeGet('/students', { limit: 250, status: 0 });
  if (!data?.data || !Array.isArray(data.data)) return [];

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return data.data.filter((s: any) => {
    const dStr = s.vacated_date || s.updated_at;
    if (!dStr) return true;
    const d = new Date(dStr);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
}

// ─── Detailed Income Breakdown ───────────────────────────────────────────────
export async function fetchDetailedIncomeBreakdown(): Promise<any> {
  const [overviewData, guestsData] = await Promise.all([
    safeGet('/reports/monthly-overview'),
    safeGet('/guests'),
  ]);

  const cm = overviewData?.data?.currentMonth || {};
  const rentCollected = Number(cm.rentCollected ?? cm.feeCollection ?? 0);
  const guestFees = Number(guestsData?.summary?.totalCollected ?? cm.guestIncome ?? 0);
  const otherIncome = Number(cm.otherIncome ?? 0);
  const totalIncome = rentCollected + guestFees + otherIncome;

  return {
    totalIncome: totalIncome || rentCollected,
    rentCollected,
    guestFees,
    otherIncome,
  };
}

// ─── Students Ready to Vacate / Vacate Notice Submitted ─────────────────────
export async function fetchStudentsReadyToVacate(): Promise<any[]> {
  const data = await safeGet('/students', { limit: 250, status: 1 });
  if (!data?.data || !Array.isArray(data.data)) return [];

  return data.data.filter((s: any) => Boolean(s.vacate_notice_date));
}

