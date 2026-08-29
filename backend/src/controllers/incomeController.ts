import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import ExcelJS from 'exceljs';
import { sendEmail } from '../utils/email.js';
import { resolveScopedHostelId, resolveOwnerHostelId } from '../utils/scope.js';

// Get all income records
export const getAllIncome = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, hostelId } = req.query;
    const user = req.user;

    // Owner (role 2): validate BOTH user_id AND hostel_id together in DB.
    // Admin/Super Admin (role 1): scoped to ?hostelId if given, otherwise global.
    const { hostelId: scopedHostelId, error: hostelError } = await resolveOwnerHostelId(user, hostelId as string | undefined);
    if (hostelError) {
      return res.status(403).json({ success: false, error: hostelError });
    }

    let query = db('income as i')
      .leftJoin('hostel_master as h', 'i.hostel_id', 'h.hostel_id')
      .leftJoin('payment_modes as pm', 'i.payment_mode_id', 'pm.payment_mode_id')
      .select(
        'i.income_id',
        'i.hostel_id',
        'h.hostel_name',
        'i.income_date',
        'i.amount',
        'i.source',
        'pm.payment_mode_name as payment_mode',
        'i.receipt_number',
        'i.description'
      );

    if (scopedHostelId) {
      query = query.where('i.hostel_id', scopedHostelId);
    }

    // Apply date filters if provided
    if (startDate && endDate) {
      query = query.whereBetween('i.income_date', [startDate, endDate]);
    }

    const incomes = await query.orderBy('i.income_date', 'desc');

    // ── Merge in short-stay guest payments so income totals reconcile with Overview ──
    let guestRows: any[] = [];
    try {
      let guestQuery = db('guests as g')
        .leftJoin('hostel_master as h', 'g.hostel_id', 'h.hostel_id')
        .select(
          'g.guest_id',
          'g.hostel_id',
          'h.hostel_name',
          'g.check_in_date as income_date',
          'g.amount_paid as amount',
          'g.full_name',
          'g.purpose'
        )
        .where('g.amount_paid', '>', 0);
      if (scopedHostelId) {
        guestQuery = guestQuery.where('g.hostel_id', scopedHostelId);
      }
      if (startDate && endDate) {
        guestQuery = guestQuery.whereBetween('g.check_in_date', [startDate, endDate]);
      }
      const guests = await guestQuery;
      guestRows = guests.map((g: any) => ({
        income_id: `guest_${g.guest_id}`,
        hostel_id: g.hostel_id,
        hostel_name: g.hostel_name,
        income_date: g.income_date,
        amount: g.amount,
        source: 'Guest Stay',
        payment_mode: 'Cash',
        receipt_number: null,
        description: g.purpose ? `${g.full_name} — ${g.purpose}` : g.full_name,
        is_guest: true,
      }));
    } catch (e) {
      guestRows = [];
    }

    // ── Merge in admission fee payments from students table ──
    let admissionFeeRows: any[] = [];
    try {
      let admissionQuery = db('students as s')
        .leftJoin('hostel_master as h', 's.hostel_id', 'h.hostel_id')
        .select(
          's.student_id',
          's.hostel_id',
          'h.hostel_name',
          's.admission_date as income_date',
          's.admission_fee as amount',
          's.first_name',
          's.last_name'
        )
        .where('s.admission_fee', '>', 0)
        .where('s.is_old_student', 0)
        .whereNotNull('s.room_id')
        .where('s.status', 1)
        .where(function() {
          this.where('s.admission_status', 1)
            .orWhere('s.admission_status', 'Paid');
        });
      if (scopedHostelId) {
        admissionQuery = admissionQuery.where('s.hostel_id', scopedHostelId);
      }
      if (startDate && endDate) {
        admissionQuery = admissionQuery.whereBetween('s.admission_date', [startDate, endDate]);
      }
      const admissions = await admissionQuery;
      admissionFeeRows = admissions.map((s: any) => ({
        income_id: `admission_${s.student_id}`,
        hostel_id: s.hostel_id,
        hostel_name: s.hostel_name,
        income_date: s.income_date,
        amount: Number(s.amount),
        source: 'Admission Fee',
        payment_mode: 'Cash',
        receipt_number: null,
        description: `${s.first_name} ${s.last_name || ''}`.trim() + ' — Admission Fee',
        is_admission: true,
      }));
    } catch (e) {
      admissionFeeRows = [];
    }

    const merged = [...incomes, ...guestRows, ...admissionFeeRows].map(inc => ({
      ...inc,
      income_date: safeGetDateString(inc.income_date)
    })).sort((a, b) => String(b.income_date).localeCompare(String(a.income_date)));

    res.json({
      success: true,
      data: merged
    });
  } catch (error) {
    console.error('Get income error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch income records'
    });
  }
};

// Create new income record
export const createIncome = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const {
      income_date,
      amount,
      source,
      payment_mode_id,
      receipt_number,
      description
    } = req.body;

    // Validate required fields
    if (!income_date || !amount || !source || !payment_mode_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'amount must be a positive number'
      });
    }

    // Determine hostel_id based on user role. Owner always uses their own
    // hostel; Admin/Super Admin must specify hostel_id explicitly (never
    // silently defaults to the admin's own possibly-stale hostel_id).
    let hostel_id: number;

    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      hostel_id = user.hostel_id;
    } else {
      // Admin - require hostel_id in request
      hostel_id = parseInt(req.body.hostel_id);
      if (!hostel_id) {
        return res.status(400).json({
          success: false,
          error: 'hostel_id is required for admin users'
        });
      }
    }

    const [result] = await db('income').insert({
      hostel_id,
      income_date,
      amount,
      source,
      payment_mode_id,
      receipt_number: receipt_number || null,
      description: description || null
    });

    res.status(201).json({
      success: true,
      message: 'Income recorded successfully',
      data: { income_id: result }
    });
  } catch (error) {
    console.error('Create income error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create income record'
    });
  }
};

// Update income record
export const updateIncome = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { incomeId } = req.params;
    const {
      income_date,
      amount,
      source,
      payment_mode_id,
      receipt_number,
      description
    } = req.body;

    // Check if income exists
    const income = await db('income')
      .where('income_id', incomeId)
      .first();

    if (!income) {
      return res.status(404).json({
        success: false,
        error: 'Income record not found'
      });
    }

    if (amount !== undefined && (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)) {
      return res.status(400).json({
        success: false,
        error: 'amount must be a positive number'
      });
    }

    // Only Owner (role 2) is restricted to their own hostel's income; Admin/Super
    // Admin (role 1) can update income for any hostel.
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      if (income.hostel_id !== user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'You can only update income for your own hostel.'
        });
      }
    }

    await db('income')
      .where('income_id', incomeId)
      .update({
        income_date,
        amount,
        source,
        payment_mode_id,
        receipt_number: receipt_number || null,
        description: description || null,
        updated_at: new Date()
      });

    res.json({
      success: true,
      message: 'Income updated successfully'
    });
  } catch (error) {
    console.error('Update income error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update income record'
    });
  }
};

// Delete income record
export const deleteIncome = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { incomeId } = req.params;

    // Check if income exists
    const income = await db('income')
      .where('income_id', incomeId)
      .first();

    if (!income) {
      return res.status(404).json({
        success: false,
        error: 'Income record not found'
      });
    }

    // Only Owner (role 2) is restricted to their own hostel's income; Admin/Super
    // Admin (role 1) can delete income for any hostel.
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      if (income.hostel_id !== user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'You can only delete income for your own hostel.'
        });
      }
    }

    await db('income')
      .where('income_id', incomeId)
      .delete();

    res.json({
      success: true,
      message: 'Income deleted successfully'
    });
  } catch (error) {
    console.error('Delete income error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete income record'
    });
  }
};

// Get income summary by source
export const getIncomeSummary = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    let query = db('income')
      .select('source')
      .sum('amount as total_amount')
      .count('* as count')
      .groupBy('source');

    // Owner (role 2): always scoped to their own hostel. Admin/Super Admin
    // (role 1): scoped to ?hostelId if given, otherwise global across all hostels.
    const scopedHostelId = resolveScopedHostelId(user, req.query.hostelId as string | undefined);
    if (user?.role_id === 2 && !scopedHostelId) {
      return res.status(403).json({
        success: false,
        error: 'Your account is not linked to any hostel.'
      });
    }
    if (scopedHostelId) {
      query = query.where('hostel_id', scopedHostelId);
    }

    const summary = await query.orderBy('total_amount', 'desc');

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get income summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch income summary'
    });
  }
};

// Helper to format date safely in JS
export const safeGetDateString = (d: any): string => {
  if (!d) return '';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch (err) {
    return '';
  }
};

// Get income analytics for breakdown charts
export const getIncomeAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { type, date, startDate: queryStartDate, endDate: queryEndDate, page, limit, search, hostelId: queryHostelId } = req.query; // type: 'day' | 'week' | 'month', date: 'YYYY-MM-DD'
    const user = req.user;

    // Owner (role 2): always scoped to their own hostel. Admin/Super Admin
    // (role 1): scoped to ?hostelId if given, otherwise global across all hostels.
    const scopedHostelId = resolveScopedHostelId(user, queryHostelId as string | undefined);
    if (user?.role_id === 2 && !scopedHostelId) {
      return res.status(403).json({ success: false, error: 'Your account is not linked to any hostel.' });
    }

    let startDate: string, endDate: string;
    let year = new Date().getFullYear();
    let month = new Date().getMonth() + 1;
    let day = new Date().getDate();

    if (queryStartDate && queryEndDate) {
      startDate = `${queryStartDate} 00:00:00`;
      endDate = `${queryEndDate} 23:59:59`;
      const parts = (queryStartDate as string).split('-');
      if (parts.length >= 3) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
      }
    } else {
      if (!date) return res.status(400).json({ success: false, error: 'Date is required' });

      const dateStr = date as string;
      const parts = dateStr.split('-');
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);

      if (type === 'day') {
        startDate = `${dateStr} 00:00:00`;
        endDate = `${dateStr} 23:59:59`;
      } else if (type === 'week') {
        endDate = `${dateStr} 23:59:59`;
        const d = new Date(year, month - 1, day);
        d.setDate(d.getDate() - 6);
        const dy = d.getFullYear();
        const dm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        startDate = `${dy}-${dm}-${dd} 00:00:00`;
      } else {
        // Current month
        startDate = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
        const lastDay = new Date(year, month, 0).getDate();
        endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')} 23:59:59`;
      }
    }

    // 1. Fetch Income records
    let incomeQuery = db('income as i')
      .leftJoin('payment_modes as pm', 'i.payment_mode_id', 'pm.payment_mode_id')
      .whereBetween('i.income_date', [startDate, endDate]);

    if (scopedHostelId) {
      incomeQuery = incomeQuery.where('i.hostel_id', scopedHostelId);
    }

    if (search) {
      const s = `%${search}%`;
      incomeQuery = incomeQuery.where(function () {
        this.where('i.source', 'like', s)
          .orWhere('i.description', 'like', s)
          .orWhere('pm.payment_mode_name', 'like', s);
      });
    }

    const incomes = await incomeQuery.select(
      'i.*',
      'pm.payment_mode_name as payment_mode'
    );

    // 2. Fetch Fee Payment records
    let feeQuery = db('fee_payments as fp')
      .leftJoin('students as s', 'fp.student_id', 's.student_id')
      .leftJoin('rooms as r', 's.room_id', 'r.room_id')
      .leftJoin('payment_modes as pm', 'fp.payment_mode_id', 'pm.payment_mode_id')
      .leftJoin('monthly_fees as mf', 'fp.fee_id', 'mf.fee_id')
      .whereBetween('fp.payment_date', [startDate, endDate]);

    if (scopedHostelId) {
      feeQuery = feeQuery.where('fp.hostel_id', scopedHostelId);
    }

    if (search) {
      const s = `%${search}%`;
      feeQuery = feeQuery.where(function () {
        this.where('s.first_name', 'like', s)
          .orWhere('s.last_name', 'like', s)
          .orWhere('r.room_number', 'like', s)
          .orWhere('pm.payment_mode_name', 'like', s);
      });
    }

    const feePayments = await feeQuery.select(
      'fp.*',
      's.first_name',
      's.last_name',
      'r.room_number',
      'pm.payment_mode_name as payment_mode',
      'mf.total_due',
      'mf.balance'
    );

    // 2.5 Fetch Guest payments
    let guestQuery = db('guests as g')
      .where('g.amount_paid', '>', 0)
      .whereBetween('g.check_in_date', [startDate, endDate]);

    if (scopedHostelId) {
      guestQuery = guestQuery.where('g.hostel_id', scopedHostelId);
    }
    if (search) {
      const s = `%${search}%`;
      guestQuery = guestQuery.where(function () {
        this.where('g.full_name', 'like', s)
          .orWhere('g.purpose', 'like', s);
      });
    }

    let guests: any[] = [];
    try {
        guests = await guestQuery.select('g.*');
    } catch (e) {
        guests = [];
    }

    // 2.7 Fetch Admission payments
    let admissionQuery = db('students as s')
      .where('s.admission_fee', '>', 0)
      .where('s.is_old_student', 0)
      .where(function() {
        this.where('s.admission_status', 1)
          .orWhere('s.admission_status', 'Paid');
      })
      .whereBetween('s.admission_date', [startDate, endDate]);

    if (scopedHostelId) {
      admissionQuery = admissionQuery.where('s.hostel_id', scopedHostelId);
    }
    if (search) {
      const s = `%${search}%`;
      admissionQuery = admissionQuery.where(function () {
        this.where('s.first_name', 'like', s)
          .orWhere('s.last_name', 'like', s);
      });
    }

    let admissions: any[] = [];
    try {
        admissions = await admissionQuery.select('s.*');
    } catch (e) {
        admissions = [];
    }

    // 3. Combine Transactions
    const transactions = [
      ...incomes.map(inc => {
        const isDeposit = inc.source && (
          inc.source.toLowerCase().includes('deposit') ||
          inc.source.toLowerCase().includes('deduction') ||
          inc.source.toLowerCase().includes('settle') ||
          inc.source.toLowerCase().includes('damage')
        );
        return {
          id: `inc_${inc.income_id}`,
          title: inc.source || (isDeposit ? 'Deposit Deduction' : 'Other Income'),
          subtitle: isDeposit ? `Deposit / Settlement · ${inc.payment_mode || 'Cash'}` : (inc.payment_mode || 'Cash'),
          amount: parseFloat(inc.amount),
          date: safeGetDateString(inc.income_date),
          type: isDeposit ? 'Deposit' : 'Other',
          description: inc.description
        };
      }),
      ...feePayments.map(fp => ({
        id: `fee_${fp.payment_id}`,
        title: `${fp.first_name || 'Student'} ${fp.last_name || ''}`.trim(),
        subtitle: `Rent/Fee · ${fp.payment_mode || 'Cash'}`,
        amount: parseFloat(fp.amount),
        total_due: fp.total_due ? parseFloat(fp.total_due) : parseFloat(fp.amount),
        balance: fp.balance ? parseFloat(fp.balance) : 0,
        date: safeGetDateString(fp.payment_date),
        student_id: fp.student_id,
        room_number: fp.room_number,
        payment_mode: fp.payment_mode || 'Cash',
        type: 'Rent',
        notes: fp.notes
      })),
      ...guests.map(g => ({
        id: `guest_${g.guest_id}`,
        title: g.full_name || 'Guest',
        subtitle: `Guest Stay · Cash`,
        amount: parseFloat(g.amount_paid),
        date: safeGetDateString(g.check_in_date),
        type: 'Guest',
        description: g.purpose || 'Daily Stay'
      })),
      ...admissions.map(a => ({
        id: `admission_${a.student_id}`,
        title: `${a.first_name || 'Student'} ${a.last_name || ''}`.trim(),
        subtitle: `Admission · Cash`,
        amount: parseFloat(a.admission_fee),
        date: safeGetDateString(a.admission_date),
        type: 'Admission',
        student_id: a.student_id,
        description: 'Admission Fee Payment'
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const rentTotal = feePayments.reduce((sum, fp) => sum + parseFloat(fp.amount), 0);
    const depositTotal = incomes
      .filter(inc => inc.source && (
        inc.source.toLowerCase().includes('deposit') ||
        inc.source.toLowerCase().includes('deduction') ||
        inc.source.toLowerCase().includes('settle') ||
        inc.source.toLowerCase().includes('damage')
      ))
      .reduce((sum, inc) => sum + parseFloat(inc.amount), 0);
    const otherTotal = incomes
      .filter(inc => !(inc.source && (
        inc.source.toLowerCase().includes('deposit') ||
        inc.source.toLowerCase().includes('deduction') ||
        inc.source.toLowerCase().includes('settle') ||
        inc.source.toLowerCase().includes('damage')
      )))
      .reduce((sum, inc) => sum + parseFloat(inc.amount), 0);
    const guestTotal = guests.reduce((sum, g) => sum + parseFloat(g.amount_paid), 0);
    const admissionTotal = admissions.reduce((sum, a) => sum + parseFloat(a.admission_fee), 0);
    const totalAmount = rentTotal + depositTotal + otherTotal + guestTotal + admissionTotal;

    // 4. Graph Data
    let graph: { label: string; value: number }[] = [];
    if (type === 'day') {
      // For display, simulate hourly distribution if timestamps aren't precise
      graph = [
        { label: '6am', value: totalAmount * 0.05 },
        { label: '9am', value: totalAmount * 0.15 },
        { label: '12pm', value: totalAmount * 0.35 },
        { label: '3pm', value: totalAmount * 0.25 },
        { label: '6pm', value: totalAmount * 0.15 },
        { label: '9pm', value: totalAmount * 0.05 }
      ];
    } else if (type === 'week') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(year, month - 1, day);
        d.setDate(d.getDate() - i);
        const ds = safeGetDateString(d);
        const val = transactions
          .filter(t => t.date === ds)
          .reduce((s, t) => s + t.amount, 0);
        graph.push({ label: days[d.getDay()], value: val });
      }
    } else {
      // Month - 4 blocks
      for (let i = 0; i < 4; i++) {
        const val = transactions.filter(t => {
          let dNum = 1;
          if (typeof t.date === 'string' && t.date) {
            dNum = parseInt(t.date.split('-')[2], 10);
          }
          if (isNaN(dNum)) return false;
          if (i === 3) {
            // Include days 29, 30, 31 in Week 4
            return dNum > 21;
          }
          return dNum > i * 7 && dNum <= (i + 1) * 7;
        }).reduce((s, t) => s + t.amount, 0);
        graph.push({ label: `Week ${i + 1}`, value: val });
      }
    }

    let paginatedTransactions = transactions;
    let hasMore = false;
    if (page && limit) {
      const p = parseInt(page as string, 10);
      const l = parseInt(limit as string, 10);
      paginatedTransactions = transactions.slice((p - 1) * l, p * l);
      hasMore = p * l < transactions.length;
    } else {
      paginatedTransactions = transactions.slice(0, 50);
      hasMore = transactions.length > 50;
    }

    res.json({
      success: true,
      data: {
        total_amount: totalAmount,
        total_count: transactions.length,
        transactions: paginatedTransactions,
        breakdown: {
          rent: rentTotal,
          deposit: depositTotal,
          admission: admissionTotal,
          guest: guestTotal,
          other: otherTotal
        },
        graph,
        hasMore
      }
    });
  } catch (error) {
    console.error('getIncomeAnalytics Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// Helper to build comprehensive income & expense Excel workbook
export const buildIncomeExportWorkbook = async (scopedHostelId: number | undefined, params: any) => {
  const { startDate: qStart, endDate: qEnd, month: qMonth, date: qDate, type: qType } = params;

  let startDate: string;
  let endDate: string;
  let periodLabel: string;
  const now = new Date();

  if (qType === 'day' && qDate) {
    startDate = `${qDate} 00:00:00`;
    endDate = `${qDate} 23:59:59`;
    periodLabel = `Day Report (${qDate})`;
  } else if (qType === 'week' && qDate) {
    const d = new Date(qDate);
    const endStr = qDate;
    d.setDate(d.getDate() - 6);
    const startStr = safeGetDateString(d);
    startDate = `${startStr} 00:00:00`;
    endDate = `${endStr} 23:59:59`;
    periodLabel = `Weekly Report (${startStr} to ${endStr})`;
  } else if (qMonth) {
    const parts = String(qMonth).split('-');
    const y = parseInt(parts[0], 10) || now.getFullYear();
    const m = parseInt(parts[1], 10) || (now.getMonth() + 1);
    const lastDay = new Date(y, m, 0).getDate();
    startDate = `${y}-${String(m).padStart(2, '0')}-01 00:00:00`;
    endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')} 23:59:59`;
    const monthName = new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    periodLabel = `Monthly Report (${monthName})`;
  } else if (qStart && qEnd) {
    startDate = `${qStart} 00:00:00`;
    endDate = `${qEnd} 23:59:59`;
    periodLabel = `Report (${qStart} to ${qEnd})`;
  } else {
    // Default current month
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const lastDay = new Date(y, m, 0).getDate();
    startDate = `${y}-${String(m).padStart(2, '0')}-01 00:00:00`;
    endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')} 23:59:59`;
    const monthName = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    periodLabel = `Monthly Report (${monthName})`;
  }

  // Fetch hostel details
  let hostelName = 'Hostel';
  if (scopedHostelId) {
    const h = await db('hostel_master').where('hostel_id', scopedHostelId).select('hostel_name').first();
    if (h?.hostel_name) hostelName = h.hostel_name;
  }

  // 1. Fetch Income records
  let incomeQuery = db('income as i')
    .leftJoin('payment_modes as pm', 'i.payment_mode_id', 'pm.payment_mode_id')
    .select('i.*', 'pm.payment_mode_name as payment_mode');

  if (scopedHostelId) {
    incomeQuery = incomeQuery.where('i.hostel_id', scopedHostelId);
  }
  incomeQuery = incomeQuery.whereBetween('i.income_date', [startDate, endDate]);

  // 2. Fetch Fee Payment records
  let feeQuery = db('fee_payments as fp')
    .leftJoin('students as s', 'fp.student_id', 's.student_id')
    .leftJoin('rooms as r', 's.room_id', 'r.room_id')
    .leftJoin('payment_modes as pm', 'fp.payment_mode_id', 'pm.payment_mode_id')
    .select('fp.*', 's.first_name', 's.last_name', 'r.room_number', 'pm.payment_mode_name as payment_mode');

  if (scopedHostelId) {
    feeQuery = feeQuery.where('fp.hostel_id', scopedHostelId);
  }
  feeQuery = feeQuery.whereBetween('fp.payment_date', [startDate, endDate]);

  const [incomes, feePayments, expenses] = await Promise.all([
    incomeQuery,
    feeQuery,
    db('expenses as e')
      .leftJoin('expense_categories as ec', 'e.category_id', 'ec.category_id')
      .select('e.*', 'ec.category_name')
      .where(function () {
        if (scopedHostelId) this.where('e.hostel_id', scopedHostelId);
        this.whereBetween('e.expense_date', [startDate, endDate]);
      })
  ]);

  // 3. Fetch Guest Payments
  let guestQuery = db('guests as g').where('g.amount_paid', '>', 0);
  if (scopedHostelId) {
    guestQuery = guestQuery.where('g.hostel_id', scopedHostelId);
  }
  guestQuery = guestQuery.whereBetween('g.check_in_date', [startDate, endDate]);

  let guests: any[] = [];
  try { guests = await guestQuery.select('g.*'); } catch (e) { guests = []; }

  // 4. Fetch Admission Payments
  let admissionQuery = db('students as s')
    .leftJoin('rooms as r', 's.room_id', 'r.room_id')
    .where('s.admission_fee', '>', 0)
    .where('s.is_old_student', 0)
    .where(function() {
      this.where('s.admission_status', 1).orWhere('s.admission_status', 'Paid');
    })
    .select('s.*', 'r.room_number');

  if (scopedHostelId) {
    admissionQuery = admissionQuery.where('s.hostel_id', scopedHostelId);
  }
  admissionQuery = admissionQuery.whereBetween('s.admission_date', [startDate, endDate]);

  let admissions: any[] = [];
  try { admissions = await admissionQuery; } catch (e) { admissions = []; }

  // Workbook creation
  const workbook = new ExcelJS.Workbook();
  const PRIMARY_COLOR = 'FF4F46E5'; // Indigo 600
  const HEADER_ACCENT = 'FFF3F4F6';

  // --- SHEET 1: SUMMARY ---
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.properties.defaultRowHeight = 22;
  summarySheet.columns = [{ width: 30 }, { width: 22 }];

  summarySheet.mergeCells('A1:B1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = `${hostelName} - Financial Summary`;
  titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };
  summarySheet.getRow(1).height = 36;

  summarySheet.mergeCells('A2:B2');
  const subCell = summarySheet.getCell('A2');
  subCell.value = `${periodLabel} | Generated on ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  subCell.font = { size: 11, italic: true, color: { argb: 'FF4B5563' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_ACCENT } };
  summarySheet.getRow(2).height = 24;

  let totalOther = 0; incomes.forEach(i => totalOther += parseFloat(i.amount || 0));
  let totalRent = 0; feePayments.forEach(f => totalRent += parseFloat(f.amount || 0));
  let totalGuest = 0; guests.forEach(g => totalGuest += parseFloat(g.amount_paid || 0));
  let totalAdmissions = 0; admissions.forEach(a => totalAdmissions += parseFloat(a.admission_fee || 0));
  const totalIncome = totalOther + totalRent + totalGuest + totalAdmissions;

  let totalExpenses = 0;
  expenses.forEach(e => totalExpenses += parseFloat(e.amount || 0));
  const netProfit = totalIncome - totalExpenses;

  summarySheet.addRow([]);
  summarySheet.addRow(['INCOME BREAKDOWN', 'AMOUNT (INR)']).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };
  
  summarySheet.addRow(['Rent & Monthly Fees Collected', totalRent]);
  summarySheet.addRow(['Guest & Short Stay Collections', totalGuest]);
  summarySheet.addRow(['Student Admission Fees', totalAdmissions]);
  summarySheet.addRow(['Other Recorded Incomes', totalOther]);
  
  const totalIncomeRow = summarySheet.addRow(['TOTAL INCOME', totalIncome]);
  totalIncomeRow.font = { bold: true, color: { argb: 'FF047857' } }; // Green

  summarySheet.addRow([]);
  summarySheet.addRow(['EXPENSES & PROFIT/LOSS', 'AMOUNT (INR)']).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getRow(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } }; // Red

  summarySheet.addRow(['Total Operating Expenses', totalExpenses]);
  const netRow = summarySheet.addRow(['NET BALANCE / PROFIT', netProfit]);
  netRow.font = { bold: true, color: { argb: netProfit >= 0 ? 'FF047857' : 'FFDC2626' } };

  // Format currency on summary
  [5, 6, 7, 8, 9, 12, 13].forEach(r => {
    const cell = summarySheet.getCell(`B${r}`);
    cell.numFmt = '₹#,##0.00';
    cell.alignment = { horizontal: 'right' };
  });

  // --- SHEET 2: INCOME & COLLECTIONS ---
  const incomeSheet = workbook.addWorksheet('Income Details');
  incomeSheet.properties.defaultRowHeight = 20;
  incomeSheet.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Source / Student Name', key: 'name', width: 28 },
    { header: 'Room No', key: 'room', width: 12 },
    { header: 'Income Type', key: 'type', width: 18 },
    { header: 'Payment Mode', key: 'mode', width: 16 },
    { header: 'Amount (₹)', key: 'amount', width: 18 },
    { header: 'Notes / Description', key: 'notes', width: 32 }
  ];

  incomeSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  incomeSheet.getRow(1).height = 25;
  for (let c = 1; c <= 7; c++) {
    incomeSheet.getCell(1, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };
    incomeSheet.getCell(1, c).alignment = { horizontal: 'center', vertical: 'middle' };
  }

  let incRowIdx = 2;
  // Rent payments
  feePayments.forEach(fp => {
    const row = incomeSheet.addRow({
      date: safeGetDateString(fp.payment_date),
      name: `${fp.first_name || 'Student'} ${fp.last_name || ''}`.trim(),
      room: fp.room_number ? `Room ${fp.room_number}` : 'N/A',
      type: 'Rent Collection',
      mode: fp.payment_mode || 'Cash',
      amount: parseFloat(fp.amount),
      notes: fp.notes || 'Monthly Rent Payment'
    });
    incomeSheet.getCell(`F${incRowIdx}`).numFmt = '₹#,##0.00';
    incomeSheet.getCell(`F${incRowIdx}`).alignment = { horizontal: 'right' };
    incRowIdx++;
  });

  // Guest stays
  guests.forEach(g => {
    const row = incomeSheet.addRow({
      date: safeGetDateString(g.check_in_date),
      name: g.full_name || 'Guest',
      room: g.room_number ? `Room ${g.room_number}` : 'Guest',
      type: 'Guest Stay',
      mode: 'Cash',
      amount: parseFloat(g.amount_paid),
      notes: g.purpose || 'Short stay booking'
    });
    incomeSheet.getCell(`F${incRowIdx}`).numFmt = '₹#,##0.00';
    incomeSheet.getCell(`F${incRowIdx}`).alignment = { horizontal: 'right' };
    incRowIdx++;
  });

  // Admissions
  admissions.forEach(a => {
    const row = incomeSheet.addRow({
      date: safeGetDateString(a.admission_date),
      name: `${a.first_name || 'Student'} ${a.last_name || ''}`.trim(),
      room: a.room_number ? `Room ${a.room_number}` : 'N/A',
      type: 'Admission Fee',
      mode: 'Cash',
      amount: parseFloat(a.admission_fee),
      notes: 'New Student Admission'
    });
    incomeSheet.getCell(`F${incRowIdx}`).numFmt = '₹#,##0.00';
    incomeSheet.getCell(`F${incRowIdx}`).alignment = { horizontal: 'right' };
    incRowIdx++;
  });

  // Other Incomes
  incomes.forEach(inc => {
    const row = incomeSheet.addRow({
      date: safeGetDateString(inc.income_date),
      name: inc.source || 'Other Income',
      room: '—',
      type: 'Other Income',
      mode: inc.payment_mode || 'Cash',
      amount: parseFloat(inc.amount),
      notes: inc.description || '-'
    });
    incomeSheet.getCell(`F${incRowIdx}`).numFmt = '₹#,##0.00';
    incomeSheet.getCell(`F${incRowIdx}`).alignment = { horizontal: 'right' };
    incRowIdx++;
  });

  // --- SHEET 3: EXPENSES ---
  const expSheet = workbook.addWorksheet('Expense Details');
  expSheet.properties.defaultRowHeight = 20;
  expSheet.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Expense Title', key: 'title', width: 28 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Amount (₹)', key: 'amount', width: 18 },
    { header: 'Description / Remarks', key: 'details', width: 32 }
  ];

  expSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  expSheet.getRow(1).height = 25;
  for (let c = 1; c <= 5; c++) {
    expSheet.getCell(1, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
    expSheet.getCell(1, c).alignment = { horizontal: 'center', vertical: 'middle' };
  }

  let expRowIdx = 2;
  expenses.forEach(exp => {
    expSheet.addRow({
      date: safeGetDateString(exp.expense_date),
      title: exp.title || 'Expense',
      category: exp.category_name || 'General',
      amount: parseFloat(exp.amount),
      details: exp.description || '-'
    });
    expSheet.getCell(`D${expRowIdx}`).numFmt = '₹#,##0.00';
    expSheet.getCell(`D${expRowIdx}`).alignment = { horizontal: 'right' };
    expRowIdx++;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const cleanHostelName = hostelName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateTag = now.toISOString().split('T')[0];
  const filename = `${cleanHostelName}_Income_Report_${dateTag}.xlsx`;

  return {
    workbook,
    buffer: Buffer.from(buffer),
    hostelName,
    periodLabel,
    filename,
    stats: {
      totalIncome,
      totalRent,
      totalGuest,
      totalAdmissions,
      totalOther,
      totalExpenses,
      netProfit,
      totalTransactions: (feePayments.length + guests.length + admissions.length + incomes.length),
      totalExpenseRecords: expenses.length,
    }
  };
};

// Export income records to Excel (Direct Download)
export const getIncomeExport = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const scopedHostelId = resolveScopedHostelId(user, req.query.hostelId as string | undefined);
    if (user?.role_id === 2 && !scopedHostelId) {
      return res.status(403).json({ success: false, error: 'Your account is not linked to any hostel.' });
    }

    const { workbook, filename } = await buildIncomeExportWorkbook(scopedHostelId, req.query);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('getIncomeExport Error:', error);
    res.status(500).json({ success: false, error: 'Failed to export income data' });
  }
};

// Export income records to Excel and send via email (from hostixhelp@gmail.com)
export const emailIncomeExport = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { email: customEmail, recipientEmail, hostelId: queryHostelId } = req.body;

    const scopedHostelId = resolveScopedHostelId(user, queryHostelId as string | undefined);
    if (user?.role_id === 2 && !scopedHostelId) {
      return res.status(403).json({ success: false, error: 'Your account is not linked to any hostel.' });
    }

    const owner = await db('users').where({ user_id: user?.user_id }).first();

    // Determine target recipient email
    let targetEmail = (customEmail || recipientEmail || '').trim();
    if (!targetEmail) {
      targetEmail = owner?.email || user?.email || '';
    }

    if (!targetEmail) {
      return res.status(400).json({ success: false, error: 'Recipient email address not found' });
    }

    const { buffer, hostelName, periodLabel, filename, stats } = await buildIncomeExportWorkbook(scopedHostelId, req.body);

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @media only screen and (max-width: 480px) {
            .mobile-stack { display: block !important; width: 100% !important; box-sizing: border-box !important; padding-right: 0 !important; padding-left: 0 !important; margin-bottom: 10px !important; }
            .mobile-pad { padding: 18px 16px !important; }
            .mobile-title { font-size: 20px !important; }
          }
        </style>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 12px; color: #0f172a;">
        <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
          
          <!-- Banner Header -->
          <div style="background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%); background-color: #6366f1; padding: 26px 20px; text-align: center; color: #ffffff;">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #e0e7ff; margin-bottom: 4px;">Hostix Hostel Management</div>
            <h1 class="mobile-title" style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.4px; color: #ffffff;">${hostelName}</h1>
            <div style="display: inline-block; background-color: rgba(255,255,255,0.18); border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: 700; color: #ffffff; margin-top: 8px;">${periodLabel}</div>
          </div>

          <!-- Body Content -->
          <div class="mobile-pad" style="padding: 24px 20px;">
            <p style="margin-top: 0; font-size: 14px; line-height: 20px; color: #334155;">
              Hello <strong>${owner?.full_name || 'Owner'}</strong>,
            </p>
            <p style="font-size: 13.5px; line-height: 20px; color: #475569; margin-bottom: 18px;">
              Your requested financial & income report for <strong>${hostelName}</strong> has been generated and is attached below as an Excel spreadsheet.
            </p>

            <!-- KPI Cards Grid (Responsive Table) -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 14px; border-collapse: separate;">
              <tr>
                <td class="mobile-stack" width="50%" valign="top" style="padding-right: 5px; padding-bottom: 8px;">
                  <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 12px 14px;">
                    <div style="font-size: 11px; font-weight: 700; color: #15803d; text-transform: uppercase; letter-spacing: 0.5px;">Total Income</div>
                    <div style="font-size: 20px; font-weight: 800; color: #166534; margin-top: 2px;">₹${Number(stats.totalIncome).toLocaleString('en-IN')}</div>
                    <div style="font-size: 11px; color: #15803d; margin-top: 2px;">${stats.totalTransactions} transaction${stats.totalTransactions !== 1 ? 's' : ''}</div>
                  </div>
                </td>
                <td class="mobile-stack" width="50%" valign="top" style="padding-left: 5px; padding-bottom: 8px;">
                  <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 12px 14px;">
                    <div style="font-size: 11px; font-weight: 700; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.5px;">Total Expenses</div>
                    <div style="font-size: 20px; font-weight: 800; color: #991b1b; margin-top: 2px;">₹${Number(stats.totalExpenses).toLocaleString('en-IN')}</div>
                    <div style="font-size: 11px; color: #b91c1c; margin-top: 2px;">${stats.totalExpenseRecords} record${stats.totalExpenseRecords !== 1 ? 's' : ''}</div>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Net Balance Highlight -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 18px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 8px;">
                <tr>
                  <td style="font-size: 13px; font-weight: 700; color: #475569;">Net Profit / Balance</td>
                  <td style="text-align: right; font-size: 18px; font-weight: 800; color: ${stats.netProfit >= 0 ? '#16a34a' : '#dc2626'};">
                    ₹${Number(stats.netProfit).toLocaleString('en-IN')}
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 12px; color: #64748b;">
                <tr>
                  <td style="padding: 3px 0;">Rent Collections</td>
                  <td style="text-align: right; font-weight: 700; color: #1e293b;">₹${Number(stats.totalRent).toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 0;">Guest Stays</td>
                  <td style="text-align: right; font-weight: 700; color: #1e293b;">₹${Number(stats.totalGuest).toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 0;">Student Admissions</td>
                  <td style="text-align: right; font-weight: 700; color: #1e293b;">₹${Number(stats.totalAdmissions).toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 0;">Other Income</td>
                  <td style="text-align: right; font-weight: 700; color: #1e293b;">₹${Number(stats.totalOther).toLocaleString('en-IN')}</td>
                </tr>
              </table>
            </div>

            <!-- Attachment Note -->
            <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-left: 4px solid #7c3aed; padding: 10px 14px; border-radius: 8px; font-size: 12.5px; color: #5b21b6; line-height: 18px;">
              📎 <strong>Attached:</strong> <code>${filename}</code> (Excel report spreadsheet).
            </div>

            <p style="font-size: 11.5px; color: #94a3b8; margin-top: 18px; margin-bottom: 0;">
              Generated on ${formattedDate} by Hostix Automation System.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 12px 16px; text-align: center; font-size: 11px; color: #94a3b8;">
            Hostix Support (<a href="mailto:hostixhelp@gmail.com" style="color: #6366f1; text-decoration: none;">hostixhelp@gmail.com</a>) &copy; ${now.getFullYear()} Hostix Systems.
          </div>

        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: targetEmail,
      subject: `📊 ${hostelName} - ${periodLabel}`,
      html: emailHtml,
      attachments: [{
        filename,
        content: buffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }],
      emailType: 'Income Export Report',
      hostelId: scopedHostelId
    });

    res.status(200).json({
      success: true,
      message: `Report successfully sent to ${targetEmail}`
    });
  } catch (error: any) {
    console.error('emailIncomeExport Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to email report' });
  }
};

// Manually trigger daily business summary Excel report for active owner
export const triggerDailyOwnerReport = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { hostelId: queryHostelId } = req.body;
    const scopedHostelId = resolveScopedHostelId(user, queryHostelId as string | undefined);
    if (!scopedHostelId) {
      return res.status(400).json({ success: false, error: 'Hostel ID is required' });
    }

    const { sendDailyOwnerReportEmail } = await import('../utils/excelReport.js');
    await sendDailyOwnerReportEmail(user.user_id, scopedHostelId);

    res.json({
      success: true,
      message: 'Daily business Excel report sent to your email successfully'
    });
  } catch (error: any) {
    console.error('triggerDailyOwnerReport Error:', error);
    res.status(500).json({ success: false, error: 'Failed to trigger daily report' });
  }
};
