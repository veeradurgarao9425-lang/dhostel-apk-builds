import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import ExcelJS from 'exceljs';

// Get all income records
export const getAllIncome = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const user = req.user;

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

    // If user is hostel owner, filter by their current hostel from JWT
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('i.hostel_id', user.hostel_id);
    }

    // Apply date filters if provided
    if (startDate && endDate) {
      query = query.whereBetween('i.income_date', [startDate, endDate]);
    }

    const incomes = await query.orderBy('i.income_date', 'desc');

    res.json({
      success: true,
      data: incomes
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

    // Determine hostel_id based on user role
    let hostel_id: number;

    if (user?.role_id === 2) {
      // Hostel owner - use hostel from JWT
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

    // If user is hostel owner, ensure they can only update their own hostel's income
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

    // If user is hostel owner, ensure they can only delete their own hostel's income
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

    // If user is hostel owner, filter by their current hostel from JWT
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('hostel_id', user.hostel_id);
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
const safeGetDateString = (d: any): string => {
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
    const { type, date, page, limit, search } = req.query; // type: 'day' | 'week' | 'month', date: 'YYYY-MM-DD'
    const user = req.user;
    const hostelId = user?.hostel_id;

    if (!date) return res.status(400).json({ success: false, error: 'Date is required' });

    const dateStr = date as string;
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    let startDate: string, endDate: string;

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

    // 1. Fetch Income records
    let incomeQuery = db('income as i')
      .leftJoin('payment_modes as pm', 'i.payment_mode_id', 'pm.payment_mode_id')
      .whereBetween('i.income_date', [startDate, endDate]);

    if (user?.role_id === 2 && hostelId) {
      incomeQuery = incomeQuery.where('i.hostel_id', hostelId);
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
      .whereBetween('fp.payment_date', [startDate, endDate]);

    if (user?.role_id === 2 && hostelId) {
      feeQuery = feeQuery.where('fp.hostel_id', hostelId);
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
      'pm.payment_mode_name as payment_mode'
    );

    // 3. Combine Transactions
    const transactions = [
      ...incomes.map(inc => ({
        id: `inc_${inc.income_id}`,
        title: inc.source || 'Other Income',
        subtitle: inc.payment_mode || 'Cash',
        amount: parseFloat(inc.amount),
        date: safeGetDateString(inc.income_date),
        type: 'Other',
        description: inc.description
      })),
      ...feePayments.map(fp => ({
        id: `fee_${fp.payment_id}`,
        title: `${fp.first_name || 'Student'} ${fp.last_name || ''}`,
        subtitle: `Rent · ${fp.payment_mode || 'Cash'}`,
        amount: parseFloat(fp.amount),
        date: safeGetDateString(fp.payment_date),
        student_id: fp.student_id,
        room_number: fp.room_number,
        payment_mode: fp.payment_mode || 'Cash',
        type: 'Rent'
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const rentTotal = feePayments.reduce((sum, fp) => sum + parseFloat(fp.amount), 0);
    const otherTotal = incomes.reduce((sum, inc) => sum + parseFloat(inc.amount), 0);
    const totalAmount = rentTotal + otherTotal;

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
        breakdown: { rent: rentTotal, other: otherTotal },
        graph,
        hasMore
      }
    });
  } catch (error) {
    console.error('getIncomeAnalytics Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// Export income records to Excel
export const getIncomeExport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const user = req.user;
    const hostelId = user?.hostel_id;

    // 1. Fetch Income records
    let incomeQuery = db('income as i')
      .leftJoin('payment_modes as pm', 'i.payment_mode_id', 'pm.payment_mode_id')
      .select('i.*', 'pm.payment_mode_name as payment_mode');

    if (user?.role_id === 2 && hostelId) {
      incomeQuery = incomeQuery.where('i.hostel_id', hostelId);
    }
    if (startDate && endDate) {
      incomeQuery = incomeQuery.whereBetween('i.income_date', [startDate, endDate]);
    }

    // 2. Fetch Fee Payment records
    let feeQuery = db('fee_payments as fp')
      .leftJoin('students as s', 'fp.student_id', 's.student_id')
      .leftJoin('payment_modes as pm', 'fp.payment_mode_id', 'pm.payment_mode_id')
      .select('fp.*', 's.first_name', 's.last_name', 'pm.payment_mode_name as payment_mode');

    if (user?.role_id === 2 && hostelId) {
      feeQuery = feeQuery.where('fp.hostel_id', hostelId);
    }
    if (startDate && endDate) {
      feeQuery = feeQuery.whereBetween('fp.payment_date', [startDate, endDate]);
    }

    const [incomes, feePayments, expenses] = await Promise.all([
      incomeQuery,
      feeQuery,
      db('expenses as e')
        .leftJoin('expense_categories as ec', 'e.category_id', 'ec.category_id')
        .select('e.*', 'ec.category_name')
        .where(function () {
          if (user?.role_id === 2 && hostelId) this.where('e.hostel_id', hostelId);
          if (startDate && endDate) this.whereBetween('e.expense_date', [startDate, endDate]);
        })
    ]);

    // Create workbook
    const workbook = new ExcelJS.Workbook();

    // --- SHEET 1: INCOME ---
    const worksheet = workbook.addWorksheet('Income');
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Source/Student', key: 'title', width: 25 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Payment Mode', key: 'mode', width: 15 },
      { header: 'Details', key: 'details', width: 30 }
    ];

    incomes.forEach(inc => {
      worksheet.addRow({
        date: inc.income_date,
        title: inc.source || 'Other Income',
        amount: parseFloat(inc.amount),
        type: 'Other',
        mode: inc.payment_mode || 'Cash',
        details: inc.description || '-'
      });
    });

    feePayments.forEach(fp => {
      worksheet.addRow({
        date: fp.payment_date,
        title: `${fp.first_name || 'Student'} ${fp.last_name || ''}`,
        amount: parseFloat(fp.amount),
        type: 'Rent',
        mode: fp.payment_mode || 'Cash',
        details: `Rent Payment - Student ID: ${fp.student_id}`
      });
    });
    worksheet.getRow(1).font = { bold: true };

    // --- SHEET 2: EXPENSES ---
    const expSheet = workbook.addWorksheet('Expenses');
    expSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Title', key: 'title', width: 25 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Description', key: 'details', width: 30 }
    ];

    expenses.forEach(exp => {
      expSheet.addRow({
        date: exp.expense_date,
        title: exp.title,
        category: exp.category_name,
        amount: parseFloat(exp.amount),
        details: exp.description || '-'
      });
    });
    expSheet.getRow(1).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=report_${startDate || 'all'}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('getIncomeExport Error:', error);
    res.status(500).json({ success: false, error: 'Failed to export data' });
  }
};
